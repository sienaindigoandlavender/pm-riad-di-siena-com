# Tasks (pm.riaddisiena.com) — notes for Claude

Jacqueline's own task and project manager. Starts at pm.riaddisiena.com; the mature version becomes a standalone app for all her projects, not only Riad di Siena. Not a SaaS.

## Design
- Cute and whimsical: joy and fun. Picture-book flat, round friendly shapes, rounded sheets and pill buttons. Fredoka for headings, DM Sans for body. Cream page (#fffaf3), plum ink (#2b2238).
- Mascot: Hudhud the hoopoe (`Hoopoe.tsx`, SVG in code; also the favicon `src/app/icon.svg`). She waves and sleeps at night.
- Calm Sunsama pace, no gamification theater: no score rings, no done counts, no cheering. Header chips only state what's open or planned (zero chips are hidden).
- Pastel-bright palette: berry, tangerine, sunflower, mint, sky, lavender, coral, leaf, teal, rose. Each project wears one (check rings, dot, flowers). Smart lists: Today lavender, Upcoming coral, Inbox mint, Flagged sunflower. Older earth/Apple colours map to their twins in `colors.ts`.
- Each view opens with a garden (`HeroScene.tsx`): pastel sky in the list colour, a smiling sun that follows the Marrakech hour (sleepy moon and stars after 19h), round hills, Hudhud, and one flower per task finished today in its project colour. 
- Checks fill with a soft pop. Gentle motion only; everything respects reduced motion.
- Sentence-case headings, no all-caps labels.
- Legibility always: body 15–16px, meta 13px minimum, secondary text never paler than #6e647c.
- Calm and fast: changes show instantly (optimistic) and save in the background.

## Now
- The garden gate (`src/middleware.ts`, `src/lib/auth.ts`, `/login`): one password (`PM_PASSWORD`) sets a year-long httpOnly cookie signed with `PM_SESSION_SECRET`; rotating the secret signs everyone out. Machines (Make, Claude) reach `/api/*` with `Authorization: Bearer <PM_API_TOKEN>`. If the password or secret env var is missing, the gate stays open (old behaviour).
- Views: Today ("On the calendar" first, then plan the day, carry over from earlier, up next, done today), Upcoming, Inbox, Flagged, Calendar (Day/Week time grid, Month, Year; repeating tasks show next visits as dashed ghosts, daily ones two weeks ahead), Timeline (Gantt by project, start → due), Projects, People (`/people/[id]`).
- Appointments (`pm_appointments`): title, date, all-day or start/end time, repeat, place, project, who, notes. A new one is a draft until "Add". Click an hour in Day/Week to start one there.
- iCal feeds (`pm_feeds`): any .ics / webcal link (Google, iCloud, Airbnb, Booking). `/api/feeds/events` fetches on the server (cached 15 min), expands repeats and moved/cancelled occurrences with ical.js, converts to Marrakech time (`src/lib/ics.ts`). Read-only in the app.
- Assign to: Me (null), Zahra, Mouad (`src/lib/team.ts`). Avatars on rows; People lists in the sidebar.
- Task: title, project, start date, due date, repeat (daily/weekdays/weekly/monthly/yearly), priority, notes, subtasks, "on today". Ticking a repeating task plants the next copy (with fresh subtasks) past today; logic in `src/lib/repeat.ts`.
- The garden header shows the date, the live Marrakech time and the weather (Open-Meteo, no key, fetched in the browser; rain and clouds appear in the sky).
- Projects sort A–Z or in her own order (drag the dots; arrow keys work too). The sort choice and a collapsed desktop sidebar are remembered per browser.
- The burger copies riaddisiena.com: two uneven lines; on phones the menu unrolls full screen from the top.
- `start_date`, `repeat`, `assignee` and the appointment/feed tables were added later: load falls back if they're missing and shows a notice to re-run `pm-setup.sql`.
- Calendar merging lives in `src/lib/calendar.ts` (`itemsByDay`, `layoutDay` for overlaps).
- Ideas (`/ideas`, `/ideas/[id]`, `pm_boards`): brainstorm boards. Round idea cards on a React Flow canvas (`BoardView.tsx`, loaded only on board pages), arrows between them, colours from the project palette, "Make it a task" creates a task in the board's project and the card shows its state. The whole canvas is one jsonb document saved 700ms after changes.
- Vision (`/vision`, `VisionView.tsx`, `src/lib/vision.ts`): the vision statement, then goals on four horizons (Now, Next 3 months, This year, In 3 years). Goals link to projects (showing their open tasks), carry dated milestones ("Milestones ahead" lists the next ones), can be marked reached. One document stored in `pm_boards` under the fixed id `VISION_ID` (hidden from the Ideas list); saved 700ms after changes.
- Notes (`/notes`, `/notes/[id]`, `pm_notes`, `NotesView.tsx`, `src/lib/notes.ts`): her own small Obsidian. Plain text with a safe Markdown subset (headings, bold/italic, lists, [ ] checkboxes, quotes, code, links), `[[Note title]]` links (a missing one is created on click), `#tags` (stored in `tags`), backlinks ("Linked from"), search, project per note. Read/Write toggle; autosave. Claude can file notes via `POST /api/notes` with the bearer token.

## Later
- Separate logins per person, assigning tasks to the team (Zahra, Mouad), notifications. `pm_events` already records every change for this.
- The repo is public: never put secrets in code; the gate's values live only in Vercel env vars.

## Stack
Next.js 15 (App Router), TypeScript, Tailwind v4 (tokens in `src/app/globals.css`), pnpm, Vercel, Supabase (service role, server only). Tables prefixed `pm_`, setup in `supabase/pm-setup.sql`.

- `src/lib/load.ts` loads open tasks + last 30 days of done ones; pages render per request.
- `src/components/useWorkspace.ts` holds client state and talks to `/api/tasks`, `/api/projects`.
- Deletes are soft (`deleted_at`).
- Dates use Africa/Casablanca and are formatted by hand (no locale APIs) so server and browser match.
