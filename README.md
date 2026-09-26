# Life Tracker

Personal daily habit tracker — Solat, Taubat, Quran, routines, health metrics, family, trading practice.

## Live setup

- **Backend:** Supabase project `life-tracker` (ap-southeast-1)
  - URL: `https://ydjixzyxmhjxqdctuwcm.supabase.co`
  - Table: `tracker_months` (one row per user per month, JSON blob, RLS-locked to the signed-in user)
- **Auth:** Supabase magic-link email sign-in (no password). Sign in once per device/browser.
- **Frontend:** single static file (`index.html`) — no build step, no server needed.

## Publish to GitHub Pages

1. Push this folder to a GitHub repo (`index.html` at the root).
2. Repo → Settings → Pages → Source → `main` branch → Save.
3. Visit `https://<username>.github.io/<repo>/` — the tracker loads directly (no extra filename needed).

## How data flows

1. Open the site → sign in with email (magic link).
2. Every tap/keystroke writes to `localStorage` instantly (offline-safe) and syncs to Supabase in the background.
3. Opening the site on another device, after signing in with the same email, pulls the same data down.
4. **Backup / Restore** buttons at the bottom export/import a full JSON snapshot — keep an occasional manual copy regardless of the cloud sync.

## If you ever need to rebuild the database

Run `schema.sql` in the Supabase project's SQL editor. It's idempotent (`create table if not exists`).
