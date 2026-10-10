import { NextRequest, NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";
import { VISION_ID } from "@/lib/vision";

const missingTable = (m: string) => /pm_boards/.test(m) && /does not exist|schema cache/i.test(m);

/** All boards, newest first, with how many ideas each holds. */
export async function GET() {
  const client = db();
  if (!client) return NextResponse.json({ boards: [] });
  const { data, error } = await client
    .from("pm_boards")
    .select("id, name, project_id, data, updated_at")
    .is("deleted_at", null)
    .neq("id", VISION_ID)
    .order("updated_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      { boards: [], error: missingTable(error.message) ? "setup" : error.message },
      { status: missingTable(error.message) ? 200 : 500 },
    );
  }
  const boards = (data || []).map(({ data: d, ...b }) => ({
    ...b,
    ideas: Array.isArray(d?.nodes) ? d.nodes.length : 0,
  }));
  return NextResponse.json({ boards });
}

export async function POST(req: NextRequest) {
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim().slice(0, 120) || "New board";
  const row = {
    ...(typeof b.id === "string" ? { id: b.id } : {}),
    name,
    project_id: typeof b.project_id === "string" ? b.project_id : null,
    data: { nodes: [], edges: [] },
  };
  const { data, error } = await client.from("pm_boards").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent("board_created", null, { board_id: data.id, name });
  return NextResponse.json({ board: data });
}
