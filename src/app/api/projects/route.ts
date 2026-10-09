import { NextRequest, NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";

export async function POST(req: NextRequest) {
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "")
    .trim()
    .slice(0, 120);
  if (!name) return NextResponse.json({ error: "A project needs a name" }, { status: 400 });
  const row = {
    ...(typeof b.id === "string" ? { id: b.id } : {}),
    name,
    color: typeof b.color === "string" ? b.color : "#111111",
    position: Date.now(),
  };
  const { data, error } = await client.from("pm_projects").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent("project_created", null, { project_id: data.id, name });
  return NextResponse.json({ project: data });
}
