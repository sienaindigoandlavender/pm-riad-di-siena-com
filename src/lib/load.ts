import "server-only";
import { connection } from "next/server";
import { addDays, today } from "./dates";
import { db } from "./db";
import type { Project, Task } from "./types";

export type Workspace = { projects: Project[]; tasks: Task[]; configured: boolean; error?: string };

const TASK_COLUMNS =
  "id, project_id, parent_id, title, notes, done, done_at, priority, due_date, planned_for, position, created_at";

/** Everything open, plus what was finished in the last 30 days. */
export async function loadWorkspace(): Promise<Workspace> {
  await connection();
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
    tasks: [...((open.data ?? []) as Task[]), ...((done.data ?? []) as Task[])],
    configured: true,
    error,
  };
}
