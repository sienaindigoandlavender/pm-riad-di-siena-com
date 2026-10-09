import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseIcs } from "@/lib/ics";
import type { FeedEvent } from "@/lib/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Events from every subscribed calendar between from and to. Each feed is cached ~15 min. */
export async function GET(req: NextRequest) {
  const client = db();
  if (!client) return NextResponse.json({ events: [], errors: {} });
  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!DATE.test(from) || !DATE.test(to) || to < from)
    return NextResponse.json({ error: "Bad range" }, { status: 400 });
  const { data: feeds, error } = await client
    .from("pm_feeds")
    .select("id, url")
    .is("deleted_at", null);
  if (error) return NextResponse.json({ events: [], errors: {} });

  const errors: Record<string, string> = {};
  const lists = await Promise.all(
    (feeds ?? []).map(async (f: { id: string; url: string }): Promise<FeedEvent[]> => {
      try {
        const res = await fetch(f.url, {
          next: { revalidate: 900 },
          headers: { Accept: "text/calendar, */*" },
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) throw new Error(`The calendar answered ${res.status}`);
        const text = await res.text();
        if (!text.includes("BEGIN:VCALENDAR")) throw new Error("That link isn't a calendar file");
        return parseIcs(text, f.id, from, to);
      } catch (e) {
        errors[f.id] = e instanceof Error ? e.message : "Couldn't read this calendar";
        return [];
      }
    }),
  );
  return NextResponse.json({ events: lists.flat(), errors });
}
