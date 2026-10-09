import "server-only";
import ICAL from "ical.js";
import type { FeedEvent } from "./types";

const TZ = "Africa/Casablanca";
const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** A JS instant as Marrakech date + "HH:MM". */
function local(d: Date): { date: string; time: string } {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

function dayBefore(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function toEvent(
  feedId: string,
  uid: string,
  title: string,
  location: string,
  start: ICAL.Time,
  end: ICAL.Time | null,
): FeedEvent {
  if (start.isDate) {
    const s = start.toString().slice(0, 10);
    // All-day end dates are exclusive in iCal.
    const e = end ? dayBefore(end.toString().slice(0, 10)) : s;
    return {
      id: `${feedId}:${uid}:${s}`,
      feed_id: feedId,
      title,
      date: s,
      end_date: e < s ? s : e,
      start: null,
      end: null,
      location,
    };
  }
  const a = local(start.toJSDate());
  const b = end ? local(end.toJSDate()) : a;
  return {
    id: `${feedId}:${uid}:${a.date}T${a.time}`,
    feed_id: feedId,
    title,
    date: a.date,
    end_date: b.date < a.date ? a.date : b.date,
    start: a.time,
    end: b.time,
    location,
  };
}

/**
 * Every occurrence in an .ics file between from and to (YYYY-MM-DD, inclusive),
 * with repeats expanded, moved/cancelled repeats respected, in Marrakech time.
 */
export function parseIcs(text: string, feedId: string, from: string, to: string): FeedEvent[] {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const tz of root.getAllSubcomponents("vtimezone")) {
    try {
      ICAL.TimezoneService.register(tz);
    } catch {}
  }
  const rangeStart = ICAL.Time.fromDateString(from);
  const rangeEnd = ICAL.Time.fromDateString(to);
  rangeEnd.adjust(1, 0, 0, 0);

  const masters = new Map<string, ICAL.Event>();
  const exceptions: ICAL.Event[] = [];
  for (const v of root.getAllSubcomponents("vevent")) {
    const e = new ICAL.Event(v);
    if (v.getFirstPropertyValue("status") === "CANCELLED" && !e.isRecurrenceException()) continue;
    if (e.isRecurrenceException()) exceptions.push(e);
    else masters.set(e.uid, e);
  }
  for (const ex of exceptions) {
    const m = masters.get(ex.uid);
    if (m) m.relateException(ex);
    else masters.set(`${ex.uid}-${ex.recurrenceId}`, ex);
  }

  const out: FeedEvent[] = [];
  for (const e of masters.values()) {
    const title = e.summary || "Busy";
    const where = e.location || "";
    if (!e.isRecurring()) {
      if (!e.startDate) continue;
      const end = e.endDate ?? e.startDate;
      if (end.compare(rangeStart) < 0 || e.startDate.compare(rangeEnd) >= 0) continue;
      out.push(toEvent(feedId, e.uid, title, where, e.startDate, e.endDate));
      continue;
    }
    const it = e.iterator();
    let next: ICAL.Time | null;
    let guard = 0;
    while ((next = it.next()) && guard++ < 2000) {
      if (next.compare(rangeEnd) >= 0) break;
      const d = e.getOccurrenceDetails(next);
      if (d.endDate.compare(rangeStart) < 0) continue;
      if (d.item.component.getFirstPropertyValue("status") === "CANCELLED") continue;
      out.push(
        toEvent(
          feedId,
          e.uid,
          d.item.summary || title,
          d.item.location || where,
          d.startDate,
          d.endDate,
        ),
      );
    }
  }
  return out;
}
