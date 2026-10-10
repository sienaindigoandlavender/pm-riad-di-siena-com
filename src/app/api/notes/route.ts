import { NextRequest, NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";
import { tagsOf } from "@/lib/notes";

const missing = (m: string) => /pm_notes/.test(m) && /does not exist|schema cache/i.test(m);

/** All notes (newest first). ?q= searches titles and text. */
export async function GET(req: NextRequest) {
  const client = db();
  if (!client) return NextResponse.json({ notes: [] });
  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
  let query = client
    .from("pm_notes")
    .select("id, title, body, project_id, tags, created_at, updated_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = query.or(`title.ilike.${like},body.ilike.${like}`);
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { notes: [], error: missing(error.message) ? "setup" : error.message },
      { status: missing(error.message) ? 200 : 500 },
    );
  }
  return NextResponse.json({ notes: data });
}

/** New note. Machines (Claude) can file notes here too. */
export async function POST(req: NextRequest) {
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const b = await req.json().catch(() => ({}));
  const body = String(b.body ?? "").slice(0, 100000);
  const row = {
    ...(typeof b.id === "string" ? { id: b.id } : {}),
    title: String(b.title ?? "").trim().slice(0, 200),
    body,
    project_id: typeof b.project_id === "string" ? b.project_id : null,
    tags: tagsOf(body),
  };
  const { data, error } = await client.from("pm_notes").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent("note_created", null, { note_id: data.id, title: data.title });
  return NextResponse.json({ note: data });
}
