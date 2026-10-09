import { NextRequest, NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof b.name === "string" && b.name.trim()) patch.name = b.name.trim().slice(0, 120);
  if (typeof b.color === "string") patch.color = b.color;
  if (typeof b.archived === "boolean") patch.archived = b.archived;
  if (typeof b.position === "number" && Number.isFinite(b.position)) patch.position = b.position;
  const { error } = await client.from("pm_projects").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent("project_updated", null, { project_id: id, ...patch });
  return NextResponse.json({ ok: true });
}
