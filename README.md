# Life Tracker

Personal daily habit tracker: Solat, Taubat, Quran, routines, health metrics, family, trading practice.

## Live setup

- **Backend:** Supabase project `life-tracker` (ap-southeast-1), URL `https://ydjixzyxmhjxqdctuwcm.supabase.co`
  - `tracker_days`: one row per user per day (the day's fields as JSON)
  - `tracker_reviews`: one row per user per month (weekly and monthly review notes)
  - `tracker_days_history`: previous version of a day each time it is overwritten
  - Row-level security: each signed-in account reads and writes only its own rows
- **Auth:** email and password, or a sign-in link by email.
- **Frontend:** single static file (`index.html`), no build step. Served by GitHub Pages.

## How data is saved

1. Every change is saved on the device immediately, so the screen never waits.
2. The device then sends only the fields that changed, merged into that day's row in the cloud. Other fields and other days are never touched.
3. Changes that can't be sent yet (offline, server error) stay on the device and are retried with back-off.
4. When the app opens, or comes back to the foreground, it downloads the latest cloud copy. Unsent changes are kept, not overwritten.
5. If another device changed the same field, the later save wins and the app shows a notice.
6. Data saved while signed out is uploaded only for days the cloud doesn't already have. Days the cloud has are kept as a backup on the device.

The status bar shows: Synced, Uploading N changes, Upload failed (retrying), or Not synced.

## Publish to GitHub Pages

1. Settings → Pages → Source: `main` branch, root folder.
2. The tracker is served at `https://<username>.github.io/<repo>/`.

## Rebuilding the database

Run `schema.sql` in the Supabase SQL editor. It is idempotent and does not delete data.
