-- Life Tracker — Supabase schema
-- Project: life-tracker (ap-southeast-1)
-- Run once via Supabase SQL editor if rebuilding from scratch.

create table if not exists public.tracker_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null,           -- format: 'YYYY-MM'
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(user_id, month_key)
);

alter table public.tracker_months enable row level security;

create policy "select_own_months"
  on public.tracker_months for select
  using (auth.uid() = user_id);

create policy "insert_own_months"
  on public.tracker_months for insert
  with check (auth.uid() = user_id);

create policy "update_own_months"
  on public.tracker_months for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
