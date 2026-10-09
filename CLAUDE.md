# Tasks (pm.riaddisiena.com) — notes for Claude

Jacqueline's own task and project manager. Starts at pm.riaddisiena.com; the mature version becomes a standalone app for all her projects, not only Riad di Siena. Not a SaaS.

## Design
- Apple-sleek, almost clinical, but alive like Reminders: Helvetica Neue, white, black ink, hairlines, no decoration.
- Colour carries meaning: each project wears an Apple system colour (its check rings, dot, title); smart lists (Today blue, Upcoming red, Inbox grey, Flagged orange) appear as tiles in the sidebar.
- The view title is big, bold and in its list colour; Today shows a ring that fills as the day's tasks get done.
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
