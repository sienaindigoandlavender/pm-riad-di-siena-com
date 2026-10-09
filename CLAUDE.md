# Tasks (pm.riaddisiena.com) — notes for Claude

Jacqueline's own task and project manager. Starts at pm.riaddisiena.com; the mature version becomes a standalone app for all her projects, not only Riad di Siena. Not a SaaS.

## Design
- Flat and delightful, not corporate (not ClickUp): Helvetica Neue, square shapes, no rounded boxes, no cards, no shadows. Solid colour planes and heavy black rules. Circles only for checks and the ring.
- Earth colours, Sunsama-soft (no rituals): slate, sage, clay, ochre, plum, teal, olive, dusty rose, walnut, stone blue. Each project wears one (check rings, dot, title); smart lists (Today slate, Upcoming clay, Inbox stone, Flagged ochre) are tiles in the sidebar. Warm off-white ground (#f5f4f1), slate accent (#4a6b85). No bright Apple orange or blue.
- Each view opens with a flat landscape band: sky in the list colour, a cream sun that moves with the Marrakech hour (moon and stars after 19h), earth-tone hills and a palm; huge white title; Today shows a white ring that fills as tasks get done, and two birds appear when all are done.
- Sentence-case headings, no all-caps labels.
- Legibility always: body 15px, meta 13px minimum, secondary text #424245 / #6e6e73, never paler.
- Calm and fast: changes show instantly (optimistic) and save in the background.

## Now
- No password while building.
- Views: Today (plan the day, carry over from earlier, up next, done today), Upcoming (by due date), Inbox, Flagged, Projects.
- Task: title, project, due date, priority (none/low/medium/high), notes, subtasks, "on today".

## Later
- Separate logins, assigning tasks to the team (Zahra, Mouad), notifications. `pm_events` already records every change for this.
- Add auth before any team member gets the link. The repo is public.

## Stack
Next.js 15 (App Router), TypeScript, Tailwind v4 (tokens in `src/app/globals.css`), pnpm, Vercel, Supabase (service role, server only). Tables prefixed `pm_`, setup in `supabase/pm-setup.sql`.

- `src/lib/load.ts` loads open tasks + last 30 days of done ones; pages render per request.
- `src/components/useWorkspace.ts` holds client state and talks to `/api/tasks`, `/api/projects`.
- Deletes are soft (`deleted_at`).
- Dates use Africa/Casablanca and are formatted by hand (no locale APIs) so server and browser match.
