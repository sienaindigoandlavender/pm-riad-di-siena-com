import { NextRequest, NextResponse } from "next/server";
import { db, logEvent } from "@/lib/db";

/** Subscribe to a calendar link (https:// or webcal://). */
export async function POST(req: NextRequest) {
  const client = db();
  if (!client) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const b = await req.json().catch(() => ({}));
  const url = String(b.url ?? "")
    .trim()
    .replace(/^webcals?:\/\//i, "https://");
  if (!/^https?:\/\/\S+$/i.test(url))
    return NextResponse.json({ error: "That doesn't look like a calendar link" }, { status: 400 });
  const row = {
    ...(typeof b.id === "string" ? { id: b.id } : {}),
    name:
      String(b.name ?? "")
        .trim()
        .slice(0, 80) || "Calendar",
    url,
    color: typeof b.color === "string" ? b.color : "#5AA9E6",
  };
  const { data, error } = await client
    .from("pm_feeds")
    .insert(row)
    .select("id, name, url, color")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logEvent("feed_added", null, { feed_id: data.id, name: row.name });
  return NextResponse.json({ feed: data });
}
