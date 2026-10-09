"use client";

import { useEffect, useRef, useState } from "react";
import { type CalItem, itemsByDay, layoutDay, minutes } from "@/lib/calendar";
import {
  DAYS,
  MONTHS,
  addDays,
  addMonths,
  longDate,
  marrakechTime,
  monthTitle,
  today,
  weekdayMon,
} from "@/lib/dates";
import type { Appointment, Task } from "@/lib/types";
import { FeedManager } from "./FeedManager";
import { tint } from "./HeroScene";
import { useFeedEvents } from "./useFeedEvents";
import type { WorkspaceApi } from "./useWorkspace";

type Mode = "day" | "week" | "month" | "year";
const MODES: [Mode, string][] = [
  ["day", "Day"],
  ["week", "Week"],
  ["month", "Month"],
  ["year", "Year"],
];
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR = 52;

const mondayOf = (d: string) => addDays(d, -weekdayMon(d));
const shortDay = (d: string) =>
  `${Number(d.slice(8))} ${MONTHS[Number(d.slice(5, 7)) - 1]!.slice(0, 3)}`;

/** The calendar: tasks, appointments and subscribed calendars, by day, week, month or year. */
export function CalendarView({
  ws,
  topLevel,
  colorOf,
  apptColor,
  onOpenTask,
  onOpenAppt,
  onNewAppt,
  QuickAdd,
  row,
}: {
  ws: WorkspaceApi;
  topLevel: Task[];
  colorOf: (t: Task) => string;
  apptColor: (a: Appointment) => string;
  onOpenTask: (id: string) => void;
  onOpenAppt: (id: string) => void;
  onNewAppt: (date: string, start?: string) => void;
  QuickAdd: React.ComponentType<{
    onAdd: (title: string) => void;
    placeholder: string;
    color: string;
  }>;
  row: (t: Task) => React.ReactNode;
}) {
  const now = today();
  const [mode, setMode] = useState<Mode>("month");
  const [cursor, setCursor] = useState(now);
  const [picked, setPicked] = useState(now);

  useEffect(() => {
    try {
      const m = localStorage.getItem("pm-cal-mode") as Mode | null;
      if (m && MODES.some(([v]) => v === m)) setMode(m);
    } catch {}
  }, []);
  const chooseMode = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem("pm-cal-mode", m);
    } catch {}
  };

  // The visible range for each mode.
  const month = cursor.slice(0, 7);
  const monthStart = mondayOf(`${month}-01`);
  const monthDays = (() => {
    const days = Array.from({ length: 42 }, (_, i) => addDays(monthStart, i));
    return days.slice(0, days[35]!.slice(0, 7) !== month ? 35 : 42);
  })();
  const weekStart = mondayOf(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const year = cursor.slice(0, 4);
  const [from, to] =
    mode === "day"
      ? [cursor, cursor]
      : mode === "week"
        ? [weekStart, weekDays[6]!]
        : mode === "month"
          ? [monthStart, monthDays[monthDays.length - 1]!]
          : [mondayOf(`${year}-01-01`), addDays(`${year}-12-31`, 6)];

  const { events, errors, loading } = useFeedEvents(ws.feeds, from, to);
  const byDay = itemsByDay({
    from,
    to,
    tasks: topLevel,
    appointments: ws.appointments,
    events,
    feeds: ws.feeds,
    colorOf,
    apptColor,
  });

  const open = (i: CalItem) => {
    if (i.kind === "task") onOpenTask(i.id);
    else if (i.kind === "appt") onOpenAppt(i.id);
  };

  const step = (n: number) =>
    setCursor((c) =>
      mode === "day"
        ? addDays(c, n)
        : mode === "week"
          ? addDays(c, 7 * n)
          : mode === "month"
            ? `${addMonths(c.slice(0, 7), n)}-01`
            : `${Number(c.slice(0, 4)) + n}-01-01`,
    );
  const title =
    mode === "day"
      ? longDate(cursor)
      : mode === "week"
        ? `${shortDay(weekStart)} – ${shortDay(weekDays[6]!)}`
        : mode === "month"
          ? monthTitle(month)
          : year;
  const atToday =
    mode === "day"
      ? cursor === now
      : mode === "week"
        ? weekStart === mondayOf(now)
        : mode === "month"
          ? month === now.slice(0, 7)
          : year === now.slice(0, 4);

  const goDay = (d: string) => {
    setCursor(d);
    setPicked(d);
    chooseMode("day");
  };

  const pickedList = byDay.get(picked) ?? [];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5">
          <RoundBtn label="Back" onClick={() => step(-1)}>
            ‹
          </RoundBtn>
          <h2 className="min-w-[150px] px-1 text-center font-display text-[22px] font-semibold md:min-w-[210px] md:text-[24px]">
            {title}
          </h2>
          <RoundBtn label="Forward" onClick={() => step(1)}>
            ›
          </RoundBtn>
          {atToday ? null : (
            <button
              type="button"
              onClick={() => {
                setCursor(now);
                setPicked(now);
              }}
              className="ms-1 rounded-full bg-accent-soft px-3 py-1.5 text-[14px] font-semibold text-accent"
            >
              Today
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex rounded-full bg-white p-1 shadow-[0_2px_0_#f0e4d6]"
            role="radiogroup"
            aria-label="Calendar view"
          >
            {MODES.map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={mode === v}
                onClick={() => chooseMode(v)}
                className={`rounded-full px-3 py-1 text-[14px] font-semibold transition-colors ${
                  mode === v ? "bg-ink text-white" : "text-ink-2 hover:bg-ground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onNewAppt(mode === "month" || mode === "year" ? picked : cursor)}
            className="flex items-center gap-1.5 rounded-full py-1.5 ps-2 pe-3.5 text-[14px] font-semibold text-white"
            style={{ background: "#5AA9E6" }}
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-white/30 text-[16px] leading-none">
              +
            </span>
            <span className="max-sm:sr-only">Appointment</span>
          </button>
        </div>
      </div>

      {mode === "month" ? (
        <MonthGrid
          days={monthDays}
          month={month}
          now={now}
          picked={picked}
          byDay={byDay}
          onPick={setPicked}
          onOpen={open}
        />
      ) : mode === "year" ? (
        <YearGrid year={year} now={now} byDay={byDay} onPick={goDay} />
      ) : (
        <TimeGrid
          days={mode === "day" ? [cursor] : weekDays}
          now={now}
          byDay={byDay}
          onOpen={open}
          onNew={onNewAppt}
          onPickDay={goDay}
        />
      )}
      {loading ? (
        <p className="mt-2 px-2 text-[13px] text-ink-2">Fetching your calendars…</p>
      ) : null}

      {mode === "month" || mode === "year" ? (
        <section className="mt-8">
          <h2 className="px-3 pb-2.5 font-display text-[22px] font-semibold">
            {picked === now ? "Today" : longDate(picked)}
          </h2>
          <QuickAdd
            color="#5AA9E6"
            placeholder={`New task on ${longDate(picked)}`}
            onAdd={(t) => ws.createTask({ title: t, due_date: picked })}
          />
          <ul className="overflow-hidden rounded-[26px] bg-white py-1.5 shadow-[0_2px_0_#f0e4d6]">
            {pickedList.length ? (
              pickedList.map((i) =>
                i.kind === "task" && !i.ghost && i.task ? (
                  row(i.task)
                ) : (
                  <AgendaRow key={i.key} item={i} onOpen={() => open(i)} />
                ),
              )
            ) : (
              <li className="px-5 py-3 text-[15px] text-ink-2">A free day. Lovely.</li>
            )}
          </ul>
        </section>
      ) : null}

      <FeedManager ws={ws} errors={errors} />
    </>
  );
}

/** A calendar line: time on the left, a colour bar, the title and where. */
export function AgendaRow({ item, onOpen }: { item: CalItem; onOpen: () => void }) {
  const clickable = item.kind !== "feed";
  return (
    <li className="mx-1.5">
      <button
        type="button"
        onClick={onOpen}
        disabled={!clickable}
        className={`flex w-full items-start gap-3 rounded-[20px] px-3 py-2.5 text-start ${
          clickable ? "hover:bg-ground" : "cursor-default"
        } ${item.ghost ? "opacity-70" : ""}`}
      >
        <span className="w-[52px] shrink-0 pt-0.5 text-[14px] font-semibold tabular-nums text-ink-2">
          {item.start ?? "All day"}
        </span>
        <span
          className="mt-0.5 w-1.5 self-stretch rounded-full"
          style={{
            background: item.ghost ? "transparent" : item.color,
            border: item.ghost ? `1.5px dashed ${item.color}` : undefined,
          }}
        />
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[16px] font-medium ${item.done ? "text-ink-3 line-through" : ""}`}
          >
            {item.repeats ? "↻ " : ""}
            {item.title}
          </span>
          <span className="block truncate text-[13px] text-ink-2">
            {[item.start && item.end ? `until ${item.end}` : null, item.location, item.source]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      </button>
    </li>
  );
}

function Chip({ item, onOpen }: { item: CalItem; onOpen: (i: CalItem) => void }) {
  const solid = item.kind !== "task" || !item.ghost;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(item);
      }}
      className={`flex w-full items-center gap-1 truncate rounded-full px-2 py-[3px] text-start text-[12.5px] font-semibold leading-tight ${
        item.done ? "line-through opacity-60" : ""
      } ${item.kind === "feed" ? "cursor-default" : ""}`}
      style={{
        background: solid ? tint(item.color, item.kind === "task" ? 0.78 : 0.62) : "transparent",
        border: solid ? "1.5px solid transparent" : `1.5px dashed ${item.color}`,
        color: "#2B2238",
      }}
      title={[item.title, item.start, item.location, item.source].filter(Boolean).join(" · ")}
    >
      {item.start ? <span className="tabular-nums opacity-75">{item.start}</span> : null}
      {item.repeats && !item.start ? <span aria-label="Repeats">↻</span> : null}
      <span className="truncate">{item.title}</span>
    </button>
  );
}

function MonthGrid({
  days,
  month,
  now,
  picked,
  byDay,
  onPick,
  onOpen,
}: {
  days: string[];
  month: string;
  now: string;
  picked: string;
  byDay: Map<string, CalItem[]>;
  onPick: (d: string) => void;
  onOpen: (i: CalItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[26px] bg-white p-2 shadow-[0_2px_0_#f0e4d6]">
      <div className="grid grid-cols-7 pb-1">
        {WEEK.map((d) => (
          <div key={d} className="py-1.5 text-center text-[13px] font-bold text-ink-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const list = byDay.get(d) ?? [];
          const inMonth = d.slice(0, 7) === month;
          return (
            <div
              key={d}
              role="button"
              tabIndex={0}
              onClick={() => onPick(d)}
              onKeyDown={(e) => e.key === "Enter" && onPick(d)}
              aria-label={longDate(d)}
              aria-pressed={d === picked}
              className={`flex min-h-[64px] cursor-pointer flex-col gap-1 rounded-[16px] p-1 transition-colors md:min-h-[112px] md:p-1.5 ${
                d === picked
                  ? "bg-accent-soft"
                  : inMonth
                    ? "hover:bg-ground"
                    : "opacity-45 hover:bg-ground"
              }`}
            >
              <span
                className={`flex size-7 items-center justify-center self-center rounded-full text-[14px] font-bold tabular-nums md:self-start ${
                  d === now ? "bg-[#8E7CE0] text-white" : "text-ink"
                }`}
              >
                {Number(d.slice(8))}
              </span>
              <span className="flex flex-wrap justify-center gap-[3px] md:hidden">
                {list.slice(0, 6).map((i) => (
                  <span
                    key={i.key}
                    className="size-[7px] rounded-full"
                    style={i.ghost ? { border: `1.5px solid ${i.color}` } : { background: i.color }}
                  />
                ))}
              </span>
              <span className="hidden flex-col gap-1 md:flex">
                {list.slice(0, 3).map((i) => (
                  <Chip key={i.key} item={i} onOpen={onOpen} />
                ))}
                {list.length > 3 ? (
                  <span className="ps-2 text-[12.5px] font-semibold text-ink-2">
                    +{list.length - 3} more
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeGrid({
  days,
  now,
  byDay,
  onOpen,
  onNew,
  onPickDay,
}: {
  days: string[];
  now: string;
  byDay: Map<string, CalItem[]>;
  onOpen: (i: CalItem) => void;
  onNew: (date: string, start?: string) => void;
  onPickDay: (d: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 7.5 * HOUR;
    const tick = () => setNowMin(minutes(marrakechTime()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  const single = days.length === 1;
  const cols = `44px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="overflow-hidden rounded-[26px] bg-white shadow-[0_2px_0_#f0e4d6]">
      {/* day headers + all-day strip */}
      <div className="grid border-b border-line-soft" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((d) => {
          const allDay = (byDay.get(d) ?? []).filter((i) => !i.start);
          return (
            <div key={d} className="flex min-w-0 flex-col gap-1 px-1 pb-2 pt-2">
              <button
                type="button"
                onClick={() => !single && onPickDay(d)}
                className={`flex items-center gap-1.5 self-center rounded-full px-2 py-0.5 md:self-start ${
                  single ? "" : "max-md:flex-col max-md:gap-0 max-md:px-0"
                } ${single ? "cursor-default" : "hover:bg-ground"}`}
              >
                <span className="text-[13px] font-bold text-ink-2">
                  {single ? (
                    DAYS[(weekdayMon(d) + 1) % 7]
                  ) : (
                    <>
                      <span className="md:hidden">{WEEK[weekdayMon(d)]![0]}</span>
                      <span className="max-md:hidden">{WEEK[weekdayMon(d)]}</span>
                    </>
                  )}
                </span>
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-[14px] font-bold tabular-nums ${
                    d === now ? "bg-[#8E7CE0] text-white" : ""
                  }`}
                >
                  {Number(d.slice(8))}
                </span>
              </button>
              <div className={`flex flex-col gap-1 ${single ? "" : "max-md:hidden"}`}>
                {allDay.slice(0, single ? 20 : 3).map((i) => (
                  <Chip key={i.key} item={i} onOpen={onOpen} />
                ))}
                {!single && allDay.length > 3 ? (
                  <span className="ps-2 text-[12px] font-semibold text-ink-2">
                    +{allDay.length - 3}
                  </span>
                ) : null}
              </div>
              {!single && allDay.length ? (
                <span className="flex flex-wrap justify-center gap-[3px] md:hidden">
                  {allDay.slice(0, 4).map((i) => (
                    <span
                      key={i.key}
                      className="size-[6px] rounded-full"
                      style={{ background: i.color }}
                    />
                  ))}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* hours */}
      <div ref={scroller} className="relative max-h-[560px] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: cols, height: 24 * HOUR }}>
          <div className="relative">
            {Array.from({ length: 24 }, (_, h) => (
              <span
                key={h}
                className="absolute end-1.5 -translate-y-1/2 text-[12px] font-semibold tabular-nums text-ink-3"
                style={{ top: h * HOUR }}
              >
                {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </span>
            ))}
          </div>
          {days.map((d) => {
            const placed = layoutDay(byDay.get(d) ?? []);
            return (
              <div
                key={d}
                className="relative border-s border-line-soft"
                onClick={(e) => {
                  const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                  const h = Math.max(0, Math.min(23, Math.floor(y / HOUR)));
                  onNew(d, `${String(h).padStart(2, "0")}:00`);
                }}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <span
                    key={h}
                    className="pointer-events-none absolute inset-x-0 border-t border-line-soft"
                    style={{ top: h * HOUR }}
                  />
                ))}
                {placed.map(({ item, col, cols: n }) => {
                  const s = minutes(item.start!);
                  const e = item.end ? Math.max(minutes(item.end), s + 20) : s + 60;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onOpen(item);
                      }}
                      className={`absolute overflow-hidden rounded-[12px] border-s-[4px] px-1.5 py-1 text-start text-[12.5px] leading-tight ${
                        item.kind === "feed" ? "cursor-default" : "hover:brightness-95"
                      }`}
                      style={{
                        top: (s / 60) * HOUR + 1,
                        height: Math.max(22, ((e - s) / 60) * HOUR - 2),
                        insetInlineStart: `calc(${(col / n) * 100}% + 2px)`,
                        width: `calc(${100 / n}% - 4px)`,
                        background: tint(item.color, 0.72),
                        borderColor: item.color,
                        color: "#2B2238",
                      }}
                      title={[
                        item.title,
                        `${item.start}–${item.end ?? ""}`,
                        item.location,
                        item.source,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      <span className="block truncate font-semibold">{item.title}</span>
                      {e - s >= 45 ? (
                        <span className="block truncate tabular-nums opacity-80">
                          {item.start}
                          {item.end ? `–${item.end}` : ""}
                          {item.location ? ` · ${item.location}` : ""}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {d === now && nowMin !== null ? (
                  <span
                    className="pointer-events-none absolute inset-x-0 z-[1] h-[2.5px] rounded-full bg-[#8E7CE0]"
                    style={{ top: (nowMin / 60) * HOUR }}
                  >
                    <span className="absolute -start-1 -top-[4px] size-[10px] rounded-full bg-[#8E7CE0]" />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function YearGrid({
  year,
  now,
  byDay,
  onPick,
}: {
  year: string;
  now: string;
  byDay: Map<string, CalItem[]>;
  onPick: (d: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {MONTHS.map((name, m) => {
        const ym = `${year}-${String(m + 1).padStart(2, "0")}`;
        const first = `${ym}-01`;
        const lead = weekdayMon(first);
        const count = new Date(Date.UTC(Number(year), m + 1, 0)).getUTCDate();
        return (
          <div key={ym} className="rounded-[22px] bg-white p-3 shadow-[0_2px_0_#f0e4d6]">
            <p className="px-1 pb-1.5 font-display text-[17px] font-semibold">{name}</p>
            <div className="grid grid-cols-7 gap-y-0.5 text-center">
              {WEEK.map((w) => (
                <span key={w} className="text-[11px] font-bold text-ink-3">
                  {w[0]}
                </span>
              ))}
              {Array.from({ length: lead }, (_, i) => (
                <span key={`x${i}`} />
              ))}
              {Array.from({ length: count }, (_, i) => {
                const d = `${ym}-${String(i + 1).padStart(2, "0")}`;
                const list = (byDay.get(d) ?? []).filter((x) => !x.ghost);
                const c = list[0]?.color;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onPick(d)}
                    aria-label={`${longDate(d)}${list.length ? `, ${list.length} on the calendar` : ""}`}
                    className={`mx-auto flex size-[26px] items-center justify-center rounded-full text-[12px] tabular-nums transition-transform hover:scale-110 ${
                      d === now
                        ? "bg-[#8E7CE0] font-bold text-white"
                        : list.length
                          ? "font-bold"
                          : "text-ink-2"
                    }`}
                    style={d !== now && c ? { background: tint(c, 0.7) } : undefined}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoundBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[24px] font-semibold leading-none text-ink shadow-[0_2px_0_#f0e4d6] transition-transform hover:scale-110"
    >
      <span className="-mt-0.5">{children}</span>
    </button>
  );
}
