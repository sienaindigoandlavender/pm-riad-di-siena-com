"use client";

import { useEffect, useRef } from "react";
import { projectColor } from "@/lib/colors";
import { MONTHS, addDays, daysBetween, today, weekdayMon } from "@/lib/dates";
import type { Project, Task } from "@/lib/types";
import { tint } from "./HeroScene";

const DAY = 28;
const WEEKS = 13;
const ROW = 44;

/** Start and end for a bar: start date (or planned day) to due date. */
function span(t: Task): [string, string] | null {
  const a = t.start_date ?? t.planned_for ?? t.due_date;
  const b = t.due_date ?? t.planned_for ?? t.start_date;
  if (!a || !b) return null;
  return a <= b ? [a, b] : [b, a];
}

/** Projects as rows of bars across the coming weeks. */
export function GanttView({
  projects,
  topLevel,
  colorOf,
  onOpen,
  openId,
}: {
  projects: Project[];
  topLevel: Task[];
  colorOf: (t: Task) => string;
  onOpen: (id: string) => void;
  openId: string | null;
}) {
  const now = today();
  const start = addDays(now, -7 - weekdayMon(now));
  const total = WEEKS * 7;
  const end = addDays(start, total - 1);
  const days = Array.from({ length: total }, (_, i) => addDays(start, i));
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = 6 * DAY;
  }, []);

  const undated = topLevel.filter((t) => !t.done && !span(t)).length;
  const groups = [
    ...projects.map((p) => ({ id: p.id, name: p.name, color: projectColor(p) })),
    { id: null as string | null, name: "Inbox", color: "#4CB59A" },
  ]
    .map((g) => ({
      ...g,
      tasks: topLevel
        .filter((t) => t.project_id === g.id)
        .map((t) => ({ t, s: span(t) }))
        .filter(
          (x): x is { t: Task; s: [string, string] } => !!x.s && x.s[1] >= start && x.s[0] <= end,
        )
        .filter((x) => !x.t.done || x.s[1] >= addDays(now, -14))
        .sort((a, b) => a.s[0].localeCompare(b.s[0])),
    }))
    .filter((g) => g.tasks.length);

  const todayX = daysBetween(start, now) * DAY;
  const width = total * DAY;

  // Month labels across the top.
  const months: { label: string; x: number }[] = [];
  days.forEach((d, i) => {
    if (i === 0 || d.endsWith("-01"))
      months.push({ label: MONTHS[Number(d.slice(5, 7)) - 1]!, x: i * DAY });
  });

  return (
    <>
      {undated ? (
        <p className="mb-3 px-2 text-[14px] text-ink-2">
          {undated} open {undated === 1 ? "task has" : "tasks have"} no dates yet. Give a task a
          start or due date and it appears here.
        </p>
      ) : null}
      <div className="overflow-hidden rounded-[26px] bg-white shadow-[0_2px_0_#f0e4d6]">
        <div ref={scroller} className="overflow-x-auto">
          <div
            style={{ width: `calc(var(--label) + ${width}px)` }}
            className="[--label:132px] md:[--label:220px]"
          >
            {/* header */}
            <div className="sticky top-0 z-[2] flex border-b border-line-soft bg-white">
              <div
                className="sticky start-0 z-[3] shrink-0 bg-white"
                style={{ width: "var(--label)" }}
              />
              <div className="relative" style={{ width, height: 52 }}>
                {months.map((m) => (
                  <span
                    key={m.x}
                    className="absolute top-1.5 ps-1.5 font-display text-[15px] font-semibold text-ink"
                    style={{ insetInlineStart: m.x }}
                  >
                    {m.label}
                  </span>
                ))}
                {days.map((d, i) => {
                  const wd = weekdayMon(d);
                  return (
                    <span
                      key={d}
                      className={`absolute bottom-1 flex h-6 items-center justify-center rounded-full text-[12px] font-bold tabular-nums ${
                        d === now
                          ? "bg-[#8E7CE0] text-white"
                          : wd >= 5
                            ? "text-ink-3"
                            : "text-ink-2"
                      }`}
                      style={{ insetInlineStart: i * DAY + 2, width: DAY - 4 }}
                    >
                      {Number(d.slice(8))}
                    </span>
                  );
                })}
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="px-5 py-8 text-[15px] text-ink-2">
                Nothing on the timeline yet. Add a start or due date to a task.
              </div>
            ) : null}

            {groups.map((g) => (
              <div key={g.id ?? "inbox"}>
                <div className="flex" style={{ height: 38 }}>
                  <div
                    className="sticky start-0 z-[1] flex shrink-0 items-center gap-2 bg-white ps-3"
                    style={{ width: "var(--label)" }}
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ background: g.color }}
                    />
                    <span className="truncate font-display text-[16px] font-semibold">
                      {g.name}
                    </span>
                  </div>
                  <Grid days={days} now={now} todayX={todayX} />
                </div>
                {g.tasks.map(({ t, s }) => {
                  const a = s[0] < start ? start : s[0];
                  const b = s[1] > end ? end : s[1];
                  const x = daysBetween(start, a) * DAY + 3;
                  const w = (daysBetween(a, b) + 1) * DAY - 6;
                  const c = colorOf(t);
                  const single = s[0] === s[1];
                  return (
                    <div key={t.id} className="flex" style={{ height: ROW }}>
                      <button
                        type="button"
                        onClick={() => onOpen(t.id)}
                        className={`sticky start-0 z-[1] shrink-0 truncate bg-white ps-8 pe-2 text-start text-[14px] ${
                          t.done ? "text-ink-3 line-through" : "text-ink"
                        } ${openId === t.id ? "font-semibold" : ""}`}
                        style={{ width: "var(--label)" }}
                        title={t.title}
                      >
                        {t.title}
                      </button>
                      <div className="relative" style={{ width }}>
                        <Grid days={days} now={now} todayX={todayX} absolute />
                        <button
                          type="button"
                          onClick={() => onOpen(t.id)}
                          className={`absolute top-[8px] flex items-center overflow-hidden rounded-full px-2.5 text-[12.5px] font-semibold text-white transition-transform hover:scale-y-110 ${
                            t.done ? "opacity-45" : ""
                          } ${openId === t.id ? "ring-[3px] ring-ink/70" : ""}`}
                          style={{
                            insetInlineStart: single ? x + (DAY - 6) / 2 - 12 : x,
                            width: single ? 28 : w,
                            height: ROW - 16,
                            background: single ? "#fff" : c,
                            border: single ? `3px solid ${c}` : undefined,
                          }}
                          title={t.title}
                          aria-label={t.title}
                        >
                          {single ? null : <span className="truncate">{t.title}</span>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-[13px] text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-7 rounded-full" style={{ background: tint("#9B7FD9", 0) }} /> start
          → due
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-full border-[3px] border-[#9B7FD9] bg-white" /> one day
        </span>
      </p>
    </>
  );
}

function Grid({
  days,
  now,
  todayX,
  absolute = false,
}: {
  days: string[];
  now: string;
  todayX: number;
  absolute?: boolean;
}) {
  return (
    <div
      className={`${absolute ? "absolute inset-0" : "relative"} pointer-events-none`}
      style={{ width: days.length * DAY }}
      aria-hidden
    >
      {days.map((d, i) =>
        weekdayMon(d) >= 5 ? (
          <span
            key={d}
            className="absolute inset-y-0 bg-[#fbf5ee]"
            style={{ insetInlineStart: i * DAY, width: DAY }}
          />
        ) : weekdayMon(d) === 0 ? (
          <span
            key={d}
            className="absolute inset-y-0 w-px bg-line-soft"
            style={{ insetInlineStart: i * DAY }}
          />
        ) : null,
      )}
      {now ? (
        <span
          className="absolute inset-y-0 w-[2.5px] rounded-full bg-[#8E7CE0]"
          style={{ insetInlineStart: todayX + DAY / 2 - 1 }}
        />
      ) : null}
    </div>
  );
}
