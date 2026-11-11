# Life Tracker

Personal daily habit tracker: Solat, Taubat, Quran, routines, health metrics, family, trading practice.

## Live setup

- **Backend:** Supabase project `life-tracker` (ap-southeast-1), URL `https://ydjixzyxmhjxqdctuwcm.supabase.co`
  - `tracker_days`: one row per user per day (the day's fields as JSON)
  - `tracker_reviews`: one row per user per month (weekly and monthly review notes)
  - `tracker_days_history`: previous version of a day each time it is overwritten
  - `tracker_plan_items`: one row per calendar event
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

## Calendar

The **Calendar** tab (`calendar.js`) is for planning:

- **Month view:** event names in each day, in the colour chosen for the event (green, yellow or red). Cancelled events are faded and struck through.
- **Day view:** a timeline of the day's events. Only hours with events are shown; free gaps over 30 minutes are labelled, and a red line marks the current time. An event that starts inside another is indented. Each event is tapped through ✓ done, ✕ cancelled, blank not yet.
- **Tasks** sit under the timeline in the day view (the header shows how many are left).
- Events are stored one row per event in `tracker_plan_items` and sync like days: saved on the device first, only changed fields uploaded. Deleting an event marks it `deleted` so other devices drop it too.

## Tasks

The **Task** section is in the Calendar day view, under the timeline. Each day has three lists: **MITs · Deep work**, **Quick wins** and **Pocket Task**. Tasks are stored in the day's row as `tasks`. When today is opened, unfinished tasks from earlier days are copied to the top of today once (marked ↪). A task deleted or ticked today is not brought back.

## Publish to GitHub Pages

1. Settings → Pages → Source: `main` branch, root folder.
2. The tracker is served at `https://<username>.github.io/<repo>/`.

## Rebuilding the database

Run `schema.sql` in the Supabase SQL editor. It is idempotent and does not delete data.
