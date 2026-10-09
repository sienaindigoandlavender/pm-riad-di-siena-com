import { NextRequest, NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";

export async function POST(req: NextRequest) {
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const b = await req.json().catch(() => ({}));
  const title = String(b.title ?? "")
    .trim()
    .slice(0, 500);
  if (!title) return NextResponse.json({ error: "A task needs a title" }, { status: 400 });
  const row = {
    ...(typeof b.id === "string" ? { id: b.id } : {}),
    title,
    project_id: b.project_id ?? null,
    parent_id: b.parent_id ?? null,
    planned_for: b.planned_for ?? null,
    due_date: b.due_date ?? null,
    priority: [0, 1, 2, 3].includes(b.priority) ? b.priority : 0,
    position: typeof b.position === "number" ? b.position : Date.now(),
  };
  const { data, error } = await client.from("pm_tasks").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent("task_created", data.id, { title });
  return NextResponse.json({ task: data });
}
