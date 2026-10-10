import { NextRequest, NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";
import { EMPTY_VISION, VISION_ID, cleanVision } from "@/lib/vision";

export async function GET() {
  const client = db();
  if (!client) return NextResponse.json({ vision: EMPTY_VISION });
  const { data, error } = await client.from("pm_boards").select("data").eq("id", VISION_ID).maybeSingle();
  if (error) return NextResponse.json({ vision: EMPTY_VISION, error: error.message });
  return NextResponse.json({ vision: data?.data?.goals ? cleanVision(data.data) : EMPTY_VISION });
}

export async function PUT(req: NextRequest) {
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const vision = cleanVision(await req.json().catch(() => ({})));
  const { error } = await client
    .from("pm_boards")
    .upsert({ id: VISION_ID, name: "Vision", data: vision, updated_at: new Date().toISOString(), deleted_at: null }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent("vision_saved", null, { goals: vision.goals.length });
  return NextResponse.json({ ok: true });
}
