import { addDays } from "./dates";
import { projections, taskDate } from "./repeat";
import type { Appointment, Feed, FeedEvent, Task } from "./types";

export type CalItem = {
  key: string;
  kind: "task" | "appt" | "feed";
  id: string;
  title: string;
  date: string;
  start: string | null;
  end: string | null;
  color: string;
  ghost?: boolean;
  done?: boolean;
  location?: string;
  repeats?: boolean;
  source?: string;
  task?: Task;
};

export const APPT_COLOR = "#5AA9E6";

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const minutes = toMin;

/** Everything on the calendar between from and to, grouped by day and sorted by time. */
export function itemsByDay(opts: {
  from: string;
  to: string;
  tasks: Task[];
  appointments: Appointment[];
  events: FeedEvent[];
  feeds: Feed[];
  colorOf: (t: Task) => string;
  apptColor: (a: Appointment) => string;
}): Map<string, CalItem[]> {
  const { from, to } = opts;
  const map = new Map<string, CalItem[]>();
  const put = (i: CalItem) => {
    if (i.date < from || i.date > to) return;
    const list = map.get(i.date) ?? [];
    list.push(i);
    map.set(i.date, list);
  };

  for (const t of opts.tasks) {
    const d = taskDate(t);
    const base = {
      kind: "task" as const,
      id: t.id,
      title: t.title,
      start: null,
      end: null,
      color: opts.colorOf(t),
      done: t.done,
      repeats: !!t.repeat,
      task: t,
    };
    if (d) put({ ...base, key: `t:${t.id}:${d}`, date: d });
    for (const p of projections(t, from, to))
      put({ ...base, key: `t:${t.id}:${p}`, date: p, ghost: true });
  }

  for (const a of opts.appointments) {
    const base = {
      kind: "appt" as const,
      id: a.id,
      title: a.title,
      start: a.start_time,
      end: a.end_time,
      color: opts.apptColor(a),
      location: a.location,
      repeats: !!a.repeat,
    };
    put({ ...base, key: `a:${a.id}:${a.date}`, date: a.date });
    if (a.repeat) {
      const fake = { due_date: a.date, planned_for: null, repeat: a.repeat, done: false } as Task;
      for (const p of projections(fake, from, to, 400))
        put({ ...base, key: `a:${a.id}:${p}`, date: p });
    }
  }

  const feedById = new Map(opts.feeds.map((f) => [f.id, f]));
  for (const e of opts.events) {
    const f = feedById.get(e.feed_id);
    if (!f) continue;
    const base = {
      kind: "feed" as const,
      id: e.id,
      title: e.title,
      color: f.color,
      location: e.location,
      source: f.name,
    };
    if (e.start) {
      // Timed: shown on its first day.
      put({
        ...base,
        key: `f:${e.id}`,
        date: e.date,
        start: e.start,
        end: e.end_date === e.date ? e.end : "23:59",
      });
    } else {
      // All day: on every day it covers (capped).
      let d = e.date;
      for (let i = 0; d <= e.end_date && i < 62; i++, d = addDays(d, 1))
        put({ ...base, key: `f:${e.id}:${d}`, date: d, start: null, end: null });
    }
  }

  for (const list of map.values()) list.sort(byTime);
  return map;
}

/** All-day calendar things first, then timed ones by start, then tasks. */
export function byTime(a: CalItem, b: CalItem): number {
  const rank = (i: CalItem) => (i.kind === "task" ? 3 : i.start ? 2 : i.kind === "feed" ? 0 : 1);
  const r = rank(a) - rank(b);
  if (r) return r;
  if (a.start && b.start) return a.start.localeCompare(b.start);
  return Number(!!a.done) - Number(!!b.done) || Number(!!a.ghost) - Number(!!b.ghost);
}

/** Side-by-side columns for overlapping timed items in one day. */
export function layoutDay(items: CalItem[]): { item: CalItem; col: number; cols: number }[] {
  const timed = items
    .filter((i) => i.start)
    .map((i) => {
      const s = toMin(i.start!);
      const e = i.end ? Math.max(toMin(i.end), s + 20) : s + 60;
      return { item: i, s, e, col: 0, cols: 1 };
    })
    .sort((a, b) => a.s - b.s || b.e - a.e);
  const out: typeof timed = [];
  let cluster: typeof timed = [];
  let clusterEnd = -1;
  const flush = () => {
    const ends: number[] = [];
    for (const x of cluster) {
      let c = ends.findIndex((e) => e <= x.s);
      if (c === -1) {
        c = ends.length;
        ends.push(x.e);
      } else ends[c] = x.e;
      x.col = c;
    }
    for (const x of cluster) x.cols = ends.length;
    out.push(...cluster);
    cluster = [];
  };
  for (const x of timed) {
    if (cluster.length && x.s >= clusterEnd) flush();
    cluster.push(x);
    clusterEnd = Math.max(clusterEnd, x.e);
  }
  if (cluster.length) flush();
  return out.map(({ item, col, cols }) => ({ item, col, cols }));
}
