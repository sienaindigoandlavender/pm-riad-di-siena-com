import { NextRequest, NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";

const FIELDS = [
  "project_id",
  "title",
  "notes",
  "done",
  "priority",
  "due_date",
  "planned_for",
  "start_date",
  "repeat",
  "assignee",
  "position",
] as const;
const RULES = ["daily", "weekdays", "weekly", "monthly", "yearly"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of FIELDS) if (f in b) patch[f] = b[f];
  if ("repeat" in patch && patch.repeat !== null && !RULES.includes(String(patch.repeat)))
    delete patch.repeat;
  if ("done" in b) patch.done_at = b.done ? new Date().toISOString() : null;
  if (typeof patch.title === "string" && !patch.title.trim()) delete patch.title;
  const { error } = await client.from("pm_tasks").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent("done" in b ? (b.done ? "task_done" : "task_reopened") : "task_updated", id, b);
  return NextResponse.json({ ok: true });
}

/** Soft delete: the task (and its subtasks) can be recovered from the table. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const { id } = await params;
  const at = new Date().toISOString();
  const { error } = await client
    .from("pm_tasks")
    .update({ deleted_at: at })
    .or(`id.eq.${id},parent_id.eq.${id}`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent("task_deleted", id);
  return NextResponse.json({ ok: true });
}
