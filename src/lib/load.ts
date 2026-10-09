import "server-only";
import { connection } from "next/server";
import { addDays, today } from "./dates";
import { db } from "./db";
import type { Appointment, Feed, Project, Task } from "./types";

export type Workspace = {
  projects: Project[];
  tasks: Task[];
  appointments: Appointment[];
  feeds: Feed[];
  configured: boolean;
  error?: string;
  needsUpdate?: boolean;
};

const BASE_COLUMNS =
  "id, project_id, parent_id, title, notes, done, done_at, priority, due_date, planned_for, position, created_at";
// Added later; until pm-setup.sql is re-run they may be missing, so we fall back.
const NEW_COLUMNS = `${BASE_COLUMNS}, start_date, repeat, assignee`;
const MID_COLUMNS = `${BASE_COLUMNS}, start_date, repeat`;

/** Everything open, plus what was finished in the last 30 days. */
export async function loadWorkspace(): Promise<Workspace> {
  await connection();
  if (!db()) return { projects: [], tasks: [], appointments: [], feeds: [], configured: false };
  const [first, cal] = await Promise.all([loadWith(NEW_COLUMNS), loadCalendar()]);
  const missing = (e?: string) => !!e && /start_date|repeat|assignee/.test(e);
  let w = first;
  if (missing(first.error)) {
    w = await loadWith(MID_COLUMNS);
    if (missing(w.error)) w = await loadWith(BASE_COLUMNS);
    w = { ...w, needsUpdate: true };
  }
  return {
    ...w,
    tasks: w.tasks.map((t) => ({
      ...t,
      start_date: t.start_date ?? null,
      repeat: t.repeat ?? null,
      assignee: t.assignee ?? null,
    })),
    appointments: cal.appointments,
    feeds: cal.feeds,
    needsUpdate: w.needsUpdate || cal.missing,
  };
}

/** Appointments and subscribed calendars. Missing tables just mean "not set up yet". */
async function loadCalendar(): Promise<{
  appointments: Appointment[];
  feeds: Feed[];
  missing: boolean;
}> {
  const client = db();
  if (!client) return { appointments: [], feeds: [], missing: false };
  const since = addDays(today(), -400);
  const [a, f] = await Promise.all([
    client
      .from("pm_appointments")
      .select(
        "id, title, date, start_time, end_time, location, notes, project_id, assignee, repeat, created_at",
      )
      .is("deleted_at", null)
      .or(`date.gte.${since},repeat.not.is.null`)
      .order("date")
      .limit(5000),
    client
      .from("pm_feeds")
      .select("id, name, url, color")
      .is("deleted_at", null)
      .order("created_at"),
  ]);
  const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);
  return {
    appointments: ((a.data ?? []) as Appointment[]).map((x) => ({
      ...x,
      start_time: hhmm(x.start_time),
      end_time: hhmm(x.end_time),
    })),
    feeds: (f.data ?? []) as Feed[],
    missing: !!a.error || !!f.error,
  };
}

type TaskLoad = Omit<Workspace, "appointments" | "feeds">;

async function loadWith(TASK_COLUMNS: string): Promise<TaskLoad> {
  const client = db();
  if (!client) return { projects: [], tasks: [], configured: false };
  const since = `${addDays(today(), -30)}T00:00:00Z`;
  const [projects, open, done] = await Promise.all([
    client
      .from("pm_projects")
      .select("id, name, color, position, archived")
      .eq("archived", false)
      .order("position"),
    client
      .from("pm_tasks")
      .select(TASK_COLUMNS)
      .is("deleted_at", null)
      .eq("done", false)
      .order("position")
      .limit(5000),
    client
      .from("pm_tasks")
      .select(TASK_COLUMNS)
      .is("deleted_at", null)
      .eq("done", true)
      .gte("done_at", since)
      .order("done_at", { ascending: false })
      .limit(2000),
  ]);
  const error = projects.error?.message ?? open.error?.message ?? done.error?.message;
  return {
    projects: (projects.data ?? []) as Project[],
    tasks: [
      ...((open.data ?? []) as unknown as Task[]),
      ...((done.data ?? []) as unknown as Task[]),
    ],
    configured: true,
    error,
  };
}
