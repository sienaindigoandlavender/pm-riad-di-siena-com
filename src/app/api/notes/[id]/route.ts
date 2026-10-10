import { NextRequest, NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";
import { tagsOf } from "@/lib/notes";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const { data, error } = await client
    .from("pm_notes")
    .select("id, title, body, project_id, tags, created_at, updated_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ note: data });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof b.title === "string") patch.title = b.title.trim().slice(0, 200);
  if (typeof b.body === "string") {
    patch.body = b.body.slice(0, 100000);
    patch.tags = tagsOf(b.body);
  }
  if ("project_id" in b) patch.project_id = typeof b.project_id === "string" ? b.project_id : null;
  const { error } = await client.from("pm_notes").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const { error } = await client.from("pm_notes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent("note_deleted", null, { note_id: id });
  return NextResponse.json({ ok: true });
}
