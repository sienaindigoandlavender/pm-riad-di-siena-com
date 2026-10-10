import { NextRequest, NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const { data, error } = await client
    .from("pm_boards")
    .select("id, name, project_id, data, updated_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ board: data });
}

/** Name, project, or the whole canvas (nodes + arrows). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof b.name === "string") patch.name = b.name.trim().slice(0, 120) || "Untitled board";
  if ("project_id" in b) patch.project_id = typeof b.project_id === "string" ? b.project_id : null;
  if (b.data && Array.isArray(b.data.nodes) && Array.isArray(b.data.edges)) {
    patch.data = {
      nodes: b.data.nodes.slice(0, 500).map((n: Record<string, unknown>) => ({
        id: String(n.id),
        x: Number(n.x) || 0,
        y: Number(n.y) || 0,
        text: String(n.text ?? "").slice(0, 600),
        color: String(n.color ?? "#3FA7A5"),
        task_id: typeof n.task_id === "string" ? n.task_id : null,
      })),
      edges: b.data.edges.slice(0, 1000).map((e: Record<string, unknown>) => ({
        id: String(e.id),
        from: String(e.from),
        to: String(e.to),
        fromSide: typeof e.fromSide === "string" ? e.fromSide : null,
        toSide: typeof e.toSide === "string" ? e.toSide : null,
      })),
    };
  }
  const { error } = await client.from("pm_boards").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const { error } = await client.from("pm_boards").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent("board_deleted", null, { board_id: id });
  return NextResponse.json({ ok: true });
}
