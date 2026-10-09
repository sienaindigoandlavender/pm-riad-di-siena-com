# Tasks (pm.riaddisiena.com) — notes for Claude

Jacqueline's own task and project manager. Starts at pm.riaddisiena.com; the mature version becomes a standalone app for all her projects, not only Riad di Siena. Not a SaaS.

## Design
- Cute and whimsical: joy and fun. Picture-book flat, round friendly shapes, rounded sheets and pill buttons. Fredoka for headings, DM Sans for body. Cream page (#fffaf3), plum ink (#2b2238).
- Mascot: Hudhud the hoopoe (`Hoopoe.tsx`, SVG in code). She waves, dances when Today is all done, and sleeps at night.
- Pastel-bright palette: berry, tangerine, sunflower, mint, sky, lavender, coral, leaf, teal, rose. Each project wears one (check rings, dot, flowers). Smart lists: Today lavender, Upcoming coral, Inbox mint, Flagged sunflower. Older earth/Apple colours map to their twins in `colors.ts`.
- Each view opens with a garden (`HeroScene.tsx`): pastel sky in the list colour, a smiling sun that follows the Marrakech hour (sleepy moon and stars after 19h), round hills, Hudhud, and one flower per task finished today in its project colour. Today has a ring that fills.
- Checks pop and sparkle. Gentle motion only; everything respects reduced motion.
- Sentence-case headings, no all-caps labels.
- Legibility always: body 15–16px, meta 13px minimum, secondary text never paler than #6e647c.
- Calm and fast: changes show instantly (optimistic) and save in the background.

## Now
- No password while building.
- Views: Today (plan the day, carry over from earlier, up next, done today), Upcoming (by due date), Inbox, Flagged, Calendar (month grid; repeating tasks show their next visits as dashed ghosts, daily ones only two weeks ahead), Timeline (Gantt by project, start → due), Projects.
- Task: title, project, start date, due date, repeat (daily/weekdays/weekly/monthly/yearly), priority, notes, subtasks, "on today". Ticking a repeating task plants the next copy (with fresh subtasks) past today; logic in `src/lib/repeat.ts`.
- The garden header shows the date, the live Marrakech time and the weather (Open-Meteo, no key, fetched in the browser; rain and clouds appear in the sky).
- Projects sort A–Z or in her own order (drag the dots; arrow keys work too). The sort choice and a collapsed desktop sidebar are remembered per browser.
- The burger copies riaddisiena.com: two uneven lines; on phones the menu unrolls full screen from the top.
- `start_date` and `repeat` were added later: load falls back if they're missing and shows a notice to re-run `pm-setup.sql`.

## Later
- Separate logins, assigning tasks to the team (Zahra, Mouad), notifications. `pm_events` already records every change for this.
- Add auth before any team member gets the link. The repo is public.

## Stack
Next.js 15 (App Router), TypeScript, Tailwind v4 (tokens in `src/app/globals.css`), pnpm, Vercel, Supabase (service role, server only). Tables prefixed `pm_`, setup in `supabase/pm-setup.sql`.

- `src/lib/load.ts` loads open tasks + last 30 days of done ones; pages render per request.
- `src/components/useWorkspace.ts` holds client state and talks to `/api/tasks`, `/api/projects`.
- Deletes are soft (`deleted_at`).
- Dates use Africa/Casablanca and are formatted by hand (no locale APIs) so server and browser match.
