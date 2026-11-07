-- Life Tracker: Supabase schema (project life-tracker, ap-southeast-1)
-- Idempotent: safe to run on an existing project. Does not delete data.
--
-- Storage model: one row per user per day (tracker_days) and one row per user per month
-- for review notes (tracker_reviews). The app writes only the fields that changed.
-- Legacy table tracker_months is kept read-only for reference.

-- Server-side timestamps: device clocks cannot decide which edit is newer.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Per-day data
create table if not exists public.tracker_days (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  day        date        not null,
  data       jsonb       not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.tracker_days enable row level security;
drop policy if exists "tracker_days_select_own" on public.tracker_days;
drop policy if exists "tracker_days_insert_own" on public.tracker_days;
drop policy if exists "tracker_days_update_own" on public.tracker_days;
create policy "tracker_days_select_own" on public.tracker_days for select using (auth.uid() = user_id);
create policy "tracker_days_insert_own" on public.tracker_days for insert with check (auth.uid() = user_id);
create policy "tracker_days_update_own" on public.tracker_days for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists tracker_days_touch on public.tracker_days;
create trigger tracker_days_touch before insert or update on public.tracker_days
  for each row execute function public.touch_updated_at();

-- Review notes (weekly and monthly), one row per month
create table if not exists public.tracker_reviews (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  month_key  text        not null check (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  data       jsonb       not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_key)
);
alter table public.tracker_reviews enable row level security;
drop policy if exists "tracker_reviews_select_own" on public.tracker_reviews;
drop policy if exists "tracker_reviews_insert_own" on public.tracker_reviews;
drop policy if exists "tracker_reviews_update_own" on public.tracker_reviews;
create policy "tracker_reviews_select_own" on public.tracker_reviews for select using (auth.uid() = user_id);
create policy "tracker_reviews_insert_own" on public.tracker_reviews for insert with check (auth.uid() = user_id);
create policy "tracker_reviews_update_own" on public.tracker_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists tracker_reviews_touch on public.tracker_reviews;
create trigger tracker_reviews_touch before insert or update on public.tracker_reviews
  for each row execute function public.touch_updated_at();

-- Change history: each overwrite keeps the previous version of the day
create table if not exists public.tracker_days_history (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null,
  day         date        not null,
  data        jsonb       not null,
  replaced_at timestamptz not null default now()
);
alter table public.tracker_days_history enable row level security;
drop policy if exists "tracker_days_history_select_own" on public.tracker_days_history;
create policy "tracker_days_history_select_own" on public.tracker_days_history for select using (auth.uid() = user_id);

create or replace function public.keep_day_history()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.data is distinct from new.data then
    insert into public.tracker_days_history (user_id, day, data) values (old.user_id, old.day, old.data);
  end if;
  return new;
end $$;
drop trigger if exists tracker_days_history_keep on public.tracker_days;
create trigger tracker_days_history_keep after update on public.tracker_days
  for each row execute function public.keep_day_history();
