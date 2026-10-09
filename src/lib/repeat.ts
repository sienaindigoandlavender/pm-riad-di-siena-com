import { addDays, today } from "./dates";
import type { Repeat, Task } from "./types";

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/** The next date after `iso` for a rule. Month ends stick (31 Jan → 28 Feb → 31 Mar). */
export function advance(iso: string, rule: Repeat, anchorDay?: number): string {
  if (rule === "daily") return addDays(iso, 1);
  if (rule === "weekly") return addDays(iso, 7);
  if (rule === "weekdays") {
    let d = addDays(iso, 1);
    while ([0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay())) d = addDays(d, 1);
    return d;
  }
  const [y, m, day] = iso.split("-").map(Number) as [number, number, number];
  const want = anchorDay ?? day;
  const ny = rule === "yearly" ? y + 1 : m === 12 ? y + 1 : y;
  const nm = rule === "yearly" ? m - 1 : m % 12;
  const nd = Math.min(want, daysInMonth(ny, nm));
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

/** The date a task sits on: due date first, then the day it's planned for. */
export const taskDate = (t: Pick<Task, "due_date" | "planned_for">) => t.due_date ?? t.planned_for;

/** The next copy of a repeating task once it's done: its dates move on past today. */
export function nextCopy(t: Task, now = today()): Partial<Task> {
  const rule = t.repeat!;
  const base = taskDate(t) ?? now;
  const anchor = Number(base.slice(8, 10));
  let next = advance(base, rule, anchor);
  while (next <= now) next = advance(next, rule, anchor);
  const shift = (iso: string | null) => {
    if (!iso) return null;
    const delta = Math.round(
      (new Date(`${next}T12:00:00Z`).getTime() - new Date(`${base}T12:00:00Z`).getTime()) /
        86400000,
    );
    return addDays(iso, delta);
  };
  return {
    title: t.title,
    project_id: t.project_id,
    notes: t.notes,
    priority: t.priority,
    repeat: rule,
    due_date: t.due_date ? next : t.planned_for ? null : next,
    planned_for: t.planned_for ? next : null,
    start_date: shift(t.start_date),
  };
}

/** Future dates a repeating task will land on, between from and to (inclusive), after its own date. */
export function projections(t: Task, from: string, to: string, limit = 62): string[] {
  const base = taskDate(t);
  if (!t.repeat || t.done || !base) return [];
  const anchor = Number(base.slice(8, 10));
  const out: string[] = [];
  // Daily rhythms would fill every square; show the next two weeks only.
  if (t.repeat === "daily" || t.repeat === "weekdays") {
    const cap = addDays(today(), 14);
    if (cap < to) to = cap;
  }
  let d = advance(base, t.repeat, anchor);
  while (d <= to && out.length < limit) {
    if (d >= from) out.push(d);
    d = advance(d, t.repeat, anchor);
  }
  return out;
}
