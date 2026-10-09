"use client";

import { useState } from "react";
import { addDays, addMonths, longDate, monthTitle, today, weekdayMon } from "@/lib/dates";
import { projections, taskDate } from "@/lib/repeat";
import type { Task } from "@/lib/types";
import { tint } from "./HeroScene";
import type { WorkspaceApi } from "./useWorkspace";

type Entry = { task: Task; date: string; ghost: boolean };

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** A month of tasks. Repeating tasks show their next visits as soft ghosts. */
export function CalendarView({
  ws,
  topLevel,
  colorOf,
  onOpen,
  QuickAdd,
  row,
}: {
  row: (t: Task) => React.ReactNode;
  ws: WorkspaceApi;
  topLevel: Task[];
  colorOf: (t: Task) => string;
  onOpen: (id: string) => void;
  QuickAdd: React.ComponentType<{
    onAdd: (title: string) => void;
    placeholder: string;
    color: string;
  }>;
}) {
  const now = today();
  const [month, setMonth] = useState(now.slice(0, 7));
  const [picked, setPicked] = useState(now);

  const first = `${month}-01`;
  const gridStart = addDays(first, -weekdayMon(first));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  // Drop a trailing week that belongs entirely to the next month.
  const shown = days.slice(0, days[35]!.slice(0, 7) !== month ? 35 : 42);
  const last = shown[shown.length - 1]!;

  const byDay = new Map<string, Entry[]>();
  const put = (e: Entry) => {
    const list = byDay.get(e.date) ?? [];
    list.push(e);
    byDay.set(e.date, list);
  };
  for (const t of topLevel) {
    const d = taskDate(t);
    if (d && d >= gridStart && d <= last) put({ task: t, date: d, ghost: false });
    for (const p of projections(t, gridStart, last)) put({ task: t, date: p, ghost: true });
  }
  for (const list of byDay.values())
    list.sort(
      (a, b) => Number(a.task.done) - Number(b.task.done) || Number(a.ghost) - Number(b.ghost),
    );

  const pickedList = byDay.get(picked) ?? [];

  const chip = (e: Entry) => {
    const c = colorOf(e.task);
    return (
      <button
        key={`${e.task.id}-${e.date}`}
        type="button"
        onClick={(ev) => {
          ev.stopPropagation();
          onOpen(e.task.id);
        }}
        className={`flex w-full items-center gap-1 truncate rounded-full px-2 py-[3px] text-start text-[12.5px] font-semibold leading-tight ${
          e.task.done ? "line-through opacity-60" : ""
        }`}
        style={{
          background: e.ghost ? "transparent" : tint(c, 0.78),
          border: e.ghost ? `1.5px dashed ${c}` : "1.5px solid transparent",
          color: "#2B2238",
        }}
        title={e.task.title}
      >
        {e.task.repeat || e.ghost ? <span aria-label="Repeats">↻</span> : null}
        <span className="truncate">{e.task.title}</span>
      </button>
    );
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5">
          <RoundBtn label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))}>
            ‹
          </RoundBtn>
          <h2 className="min-w-[170px] text-center font-display text-[24px] font-semibold">
            {monthTitle(month)}
          </h2>
          <RoundBtn label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
            ›
          </RoundBtn>
        </div>
        {month !== now.slice(0, 7) || picked !== now ? (
          <button
            type="button"
            onClick={() => {
              setMonth(now.slice(0, 7));
              setPicked(now);
            }}
            className="rounded-full bg-accent-soft px-3.5 py-1.5 text-[14px] font-semibold text-accent"
          >
            Today
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[26px] bg-white p-2 shadow-[0_2px_0_#f0e4d6]">
        <div className="grid grid-cols-7 pb-1">
          {WEEK.map((d) => (
            <div key={d} className="py-1.5 text-center text-[13px] font-bold text-ink-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {shown.map((d) => {
            const list = byDay.get(d) ?? [];
            const inMonth = d.slice(0, 7) === month;
            const isToday = d === now;
            const isPicked = d === picked;
            return (
              <div
                key={d}
                role="button"
                tabIndex={0}
                onClick={() => setPicked(d)}
                onKeyDown={(e) => e.key === "Enter" && setPicked(d)}
                aria-label={longDate(d)}
                aria-pressed={isPicked}
                className={`flex min-h-[64px] cursor-pointer flex-col gap-1 rounded-[16px] p-1 transition-colors md:min-h-[112px] md:p-1.5 ${
                  isPicked
                    ? "bg-accent-soft"
                    : inMonth
                      ? "hover:bg-ground"
                      : "opacity-45 hover:bg-ground"
                }`}
              >
                <span
                  className={`flex size-7 items-center justify-center self-center rounded-full text-[14px] font-bold tabular-nums md:self-start ${
                    isToday ? "bg-[#8E7CE0] text-white" : "text-ink"
                  }`}
                >
                  {Number(d.slice(8))}
                </span>
                {/* phone: dots */}
                <span className="flex flex-wrap justify-center gap-[3px] md:hidden">
                  {list.slice(0, 6).map((e) => (
                    <span
                      key={`${e.task.id}-${e.date}`}
                      className="size-[7px] rounded-full"
                      style={
                        e.ghost
                          ? { border: `1.5px solid ${colorOf(e.task)}` }
                          : { background: colorOf(e.task) }
                      }
                    />
                  ))}
                </span>
                {/* wider: chips */}
                <span className="hidden flex-col gap-1 md:flex">
                  {list.slice(0, 3).map((e) => chip(e))}
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

      <section className="mt-8">
        <h2 className="px-3 pb-2.5 font-display text-[22px] font-semibold">
          {picked === now ? "Today" : longDate(picked)}
        </h2>
        <QuickAdd
          color="#5AA9E6"
          placeholder={`New task on ${longDate(picked)}`}
          onAdd={(title) => ws.createTask({ title, due_date: picked })}
        />
        <ul className="overflow-hidden rounded-[26px] bg-white py-1.5 shadow-[0_2px_0_#f0e4d6]">
          {pickedList.length ? (
            pickedList.map((e) =>
              e.ghost ? (
                <li key={`${e.task.id}-${e.date}`} className="mx-1.5 px-3 py-2">
                  {chip(e)}
                </li>
              ) : (
                row(e.task)
              ),
            )
          ) : (
            <li className="px-3 py-3 text-[15px] text-ink-2">A free day. Lovely.</li>
          )}
        </ul>
      </section>
    </>
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
      className="flex size-9 items-center justify-center rounded-full bg-white text-[24px] font-semibold leading-none text-ink shadow-[0_2px_0_#f0e4d6] transition-transform hover:scale-110"
    >
      <span className="-mt-0.5">{children}</span>
    </button>
  );
}
