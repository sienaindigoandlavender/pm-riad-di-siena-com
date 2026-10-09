import { NextRequest, NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";

const RULES = ["daily", "weekdays", "weekly", "monthly", "yearly"];
const PEOPLE = ["jackie", "zahra", "mouad"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/** Only the fields we know, in the shapes we expect. */
function clean(b: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (typeof b.title === "string" && b.title.trim()) out.title = b.title.trim().slice(0, 500);
  if (typeof b.date === "string" && DATE.test(b.date)) out.date = b.date;
  for (const k of ["start_time", "end_time"] as const)
    if (k in b) out[k] = typeof b[k] === "string" && TIME.test(b[k] as string) ? b[k] : null;
  for (const k of ["location", "notes"] as const)
    if (typeof b[k] === "string") out[k] = (b[k] as string).slice(0, 20000);
  if ("project_id" in b) out.project_id = typeof b.project_id === "string" ? b.project_id : null;
  if ("assignee" in b)
    out.assignee =
      typeof b.assignee === "string" && PEOPLE.includes(b.assignee) ? b.assignee : null;
  if ("repeat" in b)
    out.repeat = typeof b.repeat === "string" && RULES.includes(b.repeat) ? b.repeat : null;
  return out;
}

export async function POST(req: NextRequest) {
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const b = await req.json().catch(() => ({}));
  const row: Record<string, unknown> = {
    ...(typeof b.id === "string" ? { id: b.id } : {}),
    ...clean(b),
  };
  if (!row.title || !row.date)
    return NextResponse.json({ error: "An appointment needs a title and a date" }, { status: 400 });
  const { data, error } = await client.from("pm_appointments").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent("appointment_created", null, { appointment_id: data.id, title: row.title });
  return NextResponse.json({ appointment: data });
}
