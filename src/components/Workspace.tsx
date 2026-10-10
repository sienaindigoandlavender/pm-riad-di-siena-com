"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PROJECT_COLORS, SMART, projectColor } from "@/lib/colors";
import { longDate, marrakechHour, shortDate, today } from "@/lib/dates";
import { APPT_COLOR, itemsByDay } from "@/lib/calendar";
import { TEAM, person } from "@/lib/team";
import type { Appointment, Feed, Project, Task } from "@/lib/types";
import { AppointmentPanel } from "./AppointmentPanel";
import { AgendaRow, CalendarView } from "./CalendarView";
import { useFeedEvents } from "./useFeedEvents";
import { GanttView } from "./GanttView";
import { IdeasView } from "./IdeasView";
import dynamic from "next/dynamic";
import { HeroScene, tint } from "./HeroScene";
import { Burger, Clock, WeatherIcon, useWeather } from "./Sky";
import { Hoopoe } from "./Hoopoe";
import { TaskPanel } from "./TaskPanel";
import { TaskRow } from "./TaskRow";
import { useWorkspace, type WorkspaceApi } from "./useWorkspace";

// The canvas library is only loaded on a board page.
const BoardView = dynamic(() => import("./BoardView").then((m) => m.BoardView), {
  ssr: false,
  loading: () => <p className="px-2 text-[15px] text-ink-2">Opening the board…</p>,
});

export type View =
  | { kind: "today" }
  | { kind: "upcoming" }
  | { kind: "inbox" }
  | { kind: "flagged" }
  | { kind: "calendar" }
  | { kind: "gantt" }
  | { kind: "ideas" }
  | { kind: "board"; id: string; name: string }
  | { kind: "project"; id: string }
  | { kind: "person"; id: string };

const byPosition = (a: Task, b: Task) => a.position - b.position;
const byDue = (a: Task, b: Task) =>
  (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.position - b.position;

type RowFn = (
  t: Task,
  opts?: { showProject?: boolean; action?: React.ReactNode },
) => React.ReactNode;

export function Workspace({
  view,
  initial,
  setupNeeded,
  loadError,
  needsUpdate,
}: {
  view: View;
  initial: { projects: Project[]; tasks: Task[]; appointments?: Appointment[]; feeds?: Feed[] };
  setupNeeded?: boolean;
  loadError?: string;
  needsUpdate?: boolean;
}) {
  const ws = useWorkspace(initial);
  const [openId, setOpenIdRaw] = useState<string | null>(null);
  const [apptId, setApptId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Appointment | null>(null);
  const setOpenId = (id: string | null) => {
    setOpenIdRaw(id);
    if (id) {
      setApptId(null);
      setDraft(null);
    }
  };
  const openAppt = (id: string) => {
    setOpenIdRaw(null);
    setDraft(null);
    setApptId(id);
  };
  const newAppt = (date: string, start?: string) => {
    setOpenIdRaw(null);
    setApptId(null);
    const end = start
      ? `${String(Math.min(23, Number(start.slice(0, 2)) + 1)).padStart(2, "0")}:${start.slice(3)}`
      : null;
    setDraft({
      id: crypto.randomUUID(),
      title: "",
      date,
      start_time: start ?? "09:00",
      end_time: end ?? "10:00",
      location: "",
      notes: "",
      project_id: null,
      assignee: null,
      repeat: null,
      created_at: new Date().toISOString(),
    });
  };
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("pm-sidebar") === "closed");
    } catch {}
  }, []);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);
  const toggleMenu = () => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setCollapsed((c) => {
        try {
          localStorage.setItem("pm-sidebar", c ? "open" : "closed");
        } catch {}
        return !c;
      });
    } else setMenu((m) => !m);
  };
  const open = ws.tasks.find((t) => t.id === openId) ?? null;
  const projectById = useMemo(() => new Map(ws.projects.map((p) => [p.id, p])), [ws.projects]);
  const colorOf = (t: Task) =>
    projectColor(t.project_id ? projectById.get(t.project_id) : undefined);
  const apptColor = (a: Appointment) =>
    a.project_id && projectById.get(a.project_id)
      ? projectColor(projectById.get(a.project_id))
      : APPT_COLOR;
  const appt = draft ?? ws.appointments.find((a) => a.id === apptId) ?? null;

  const topLevel = ws.tasks.filter((t) => !t.parent_id);
  const subCount = (id: string) => {
    const subs = ws.tasks.filter((t) => t.parent_id === id);
    return { done: subs.filter((s) => s.done).length, total: subs.length };
  };

  const row: RowFn = (t, opts = {}) => (
    <TaskRow
      key={t.id}
      task={t}
      project={t.project_id ? projectById.get(t.project_id) : undefined}
      color={colorOf(t)}
      subtasks={subCount(t.id)}
      selected={t.id === openId}
      showProject={opts.showProject ?? true}
      onToggle={() => ws.patchTask(t.id, { done: !t.done })}
      onOpen={() => setOpenId(t.id)}
      action={opts.action}
    />
  );

  const project = view.kind === "project" ? projectById.get(view.id) : undefined;
  const heading =
    view.kind === "today"
      ? { title: "Today", color: SMART.today }
      : view.kind === "upcoming"
        ? { title: "Upcoming", color: SMART.upcoming }
        : view.kind === "inbox"
          ? { title: "Inbox", color: SMART.inbox }
          : view.kind === "flagged"
            ? { title: "Flagged", color: SMART.flagged }
            : view.kind === "calendar"
              ? { title: "Calendar", color: SMART.calendar }
              : view.kind === "gantt"
                ? { title: "Timeline", color: SMART.gantt }
                : view.kind === "ideas"
                  ? { title: "Ideas", color: SMART.ideas }
                  : view.kind === "board"
                    ? { title: view.name, color: SMART.ideas }
                    : view.kind === "person"
                  ? { title: person(view.id).full, color: person(view.id).color }
                  : { title: project?.name ?? "Project", color: projectColor(project) };
  const wide = view.kind === "calendar" || view.kind === "gantt" || view.kind === "board";

  return (
    <div className="flex min-h-dvh">
      <Burger
        open={menu}
        onClick={toggleMenu}
        className="fixed start-4 top-3 z-[60] md:start-5 md:top-6"
      />
      <Sidebar
        ws={ws}
        view={view}
        open={menu}
        collapsed={collapsed}
        onClose={() => setMenu(false)}
      />

      <main className={`min-w-0 flex-1 bg-bg ${open || appt ? "md:me-[452px]" : ""}`}>
        <div className="sticky top-0 z-10 flex h-[60px] items-center gap-2 bg-bg/95 ps-16 backdrop-blur-sm md:hidden">
          <Hoopoe mood="hello" size={34} />
          <span className="font-display text-[21px] font-semibold">Hudhud</span>
        </div>

        <div
          className={`mx-auto px-3 pb-28 pt-1 md:px-10 md:pt-8 ${wide ? "max-w-[1180px]" : "max-w-[760px]"} ${
            collapsed ? "md:ps-20" : ""
          }`}
        >
          <Heading
            view={view}
            title={heading.title}
            color={heading.color}
            ws={ws}
            topLevel={topLevel}
            colorOf={colorOf}
          />

          {setupNeeded ? (
            <Notice>
              The database isn&apos;t connected yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>SUPABASE_SERVICE_ROLE_KEY</code> in Vercel, then run{" "}
              <code>supabase/pm-setup.sql</code>.
            </Notice>
          ) : null}
          {loadError ? <Notice>Couldn&apos;t load your tasks: {loadError}</Notice> : null}
          {ws.error ? (
            <Notice onClose={ws.clearError}>A change didn&apos;t save: {ws.error}</Notice>
          ) : null}
          {needsUpdate ? (
            <Notice>
              Some new features need a small database update: run <code>supabase/pm-setup.sql</code>{" "}
              again in Supabase.
            </Notice>
          ) : null}

          {view.kind === "calendar" ? (
            <CalendarView
              ws={ws}
              topLevel={topLevel}
              colorOf={colorOf}
              apptColor={apptColor}
              onOpenTask={setOpenId}
              onOpenAppt={openAppt}
              onNewAppt={newAppt}
              QuickAdd={QuickAdd}
              row={(t) => row(t)}
            />
          ) : view.kind === "gantt" ? (
            <GanttView
              projects={ws.projects}
              topLevel={topLevel}
              colorOf={colorOf}
              onOpen={setOpenId}
              openId={openId}
            />
          ) : view.kind === "ideas" ? (
            <IdeasView projects={ws.projects} />
          ) : view.kind === "board" ? (
            <BoardView boardId={view.id} projects={ws.projects} tasks={ws.tasks} createTask={ws.createTask} />
          ) : view.kind === "today" ? (
            <>
              <TodayCalendar
                ws={ws}
                topLevel={topLevel}
                colorOf={colorOf}
                apptColor={apptColor}
                onOpenAppt={openAppt}
                onNewAppt={newAppt}
              />
              <TodayView ws={ws} topLevel={topLevel} row={row} />
            </>
          ) : view.kind === "upcoming" ? (
            <UpcomingView ws={ws} topLevel={topLevel} row={row} />
          ) : view.kind === "flagged" ? (
            <ListView
              ws={ws}
              tasks={topLevel.filter((t) => t.priority > 0 || (t.done && t.priority > 0))}
              projectId={null}
              color={heading.color}
              row={row}
              showProject
              sort={(a, b) => b.priority - a.priority || byDue(a, b)}
              addPlaceholder="New flagged task"
              addFields={{ priority: 2 }}
            />
          ) : view.kind === "person" ? (
            <ListView
              ws={ws}
              tasks={topLevel.filter((t) => (t.assignee ?? "jackie") === view.id)}
              projectId={null}
              color={heading.color}
              row={row}
              showProject
              addPlaceholder={`New task for ${person(view.id).full}`}
              addFields={{ assignee: view.id === "jackie" ? null : view.id }}
            />
          ) : (
            <ListView
              ws={ws}
              tasks={topLevel.filter((t) =>
                view.kind === "inbox" ? t.project_id === null : t.project_id === view.id,
              )}
              projectId={view.kind === "project" ? view.id : null}
              color={heading.color}
              row={row}
            />
          )}
          {project ? <ProjectSettings ws={ws} project={project} /> : null}
        </div>
      </main>

      {open ? (
        <TaskPanel task={open} ws={ws} color={colorOf(open)} onClose={() => setOpenId(null)} />
      ) : null}
      {appt ? (
        <AppointmentPanel
          appt={appt}
          isNew={!!draft}
          projects={ws.projects}
          color={apptColor(appt)}
          onChange={(patch) =>
            draft ? setDraft({ ...draft, ...patch }) : ws.patchAppointment(appt.id, patch)
          }
          onDelete={() => {
            ws.deleteAppointment(appt.id);
            setApptId(null);
          }}
          onSave={(patch) => {
            if (draft) {
              const t = (patch.title ?? draft.title).trim();
              ws.createAppointment({ ...draft, ...patch, title: t || "Appointment" });
            }
            setDraft(null);
          }}
          onClose={() => {
            setDraft(null);
            setApptId(null);
          }}
        />
      ) : null}
    </div>
  );
}

/** The garden at the top: date, time, weather, and a few quiet facts. No scores. */
function Heading({
  view,
  title,
  color,
  topLevel,
  colorOf,
}: {
  view: View;
  title: string;
  color: string;
  ws: WorkspaceApi;
  topLevel: Task[];
  colorOf: (t: Task) => string;
}) {
  const now = today();
  const open = topLevel.filter((t) => !t.done);
  const doneToday = topLevel.filter((t) => t.done && t.done_at && t.done_at.slice(0, 10) === now);
  let stats: { n: number; label: string }[] = [];
  if (view.kind === "today") {
    const late = open.filter(
      (t) =>
        t.planned_for !== now &&
        t.due_date !== now &&
        ((t.planned_for !== null && t.planned_for < now) ||
          (t.due_date !== null && t.due_date < now)),
    ).length;
    stats = [
      {
        n: open.filter((t) => t.planned_for === now || t.due_date === now).length,
        label: "planned",
      },
      { n: late, label: "from earlier" },
    ];
  } else if (view.kind === "project") {
    stats = [{ n: open.filter((t) => t.project_id === view.id).length, label: "open" }];
  } else if (view.kind === "person") {
    stats = [
      {
        n: open.filter((t) => (t.assignee ?? "jackie") === view.id).length,
        label: "open",
      },
    ];
  } else if (view.kind === "upcoming") {
    stats = [
      { n: open.filter((t) => t.due_date && t.due_date >= now).length, label: "with a date ahead" },
    ];
  } else if (view.kind === "inbox") {
    stats = [
      { n: open.filter((t) => t.project_id === null).length, label: "waiting for a project" },
    ];
  } else if (view.kind === "calendar") {
    const ym = now.slice(0, 7);
    stats = [
      {
        n: open.filter((t) => (t.due_date ?? t.planned_for ?? "").startsWith(ym)).length,
        label: "tasks this month",
      },
    ];
  } else if (view.kind === "gantt") {
    stats = [
      {
        n: open.filter((t) => t.start_date || t.due_date || t.planned_for).length,
        label: "on the timeline",
      },
    ];
  } else if (view.kind === "ideas" || view.kind === "board") {
    stats = [];
  } else {
    stats = [{ n: open.filter((t) => t.priority > 0).length, label: "flagged" }];
  }
  stats = stats.filter((s) => s.n > 0);
  const hour = marrakechHour();
  const night = hour >= 19 || hour < 6;
  const weather = useWeather();
  const flowers = (
    view.kind === "project" ? doneToday.filter((t) => t.project_id === view.id) : doneToday
  ).map(colorOf);
  return (
    <>
      <header
        className={`relative mb-4 h-[290px] overflow-hidden rounded-[32px] md:h-[330px] ${
          night ? "text-white" : "text-ink"
        }`}
      >
        <HeroScene sky={color} hour={hour} mood="hello" flowers={flowers} weather={weather?.kind} />
        <div className="relative px-6 pt-6 md:px-8 md:pt-7">
          <p
            className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold ${
              night ? "text-white/90" : "text-ink-2"
            }`}
          >
            <span>{longDate(now)}</span>
            <span aria-hidden>·</span>
            <Clock />
            {weather ? (
              <span className="pm-in ms-1 flex items-center gap-1 rounded-full bg-white py-0.5 ps-1.5 pe-2.5 text-ink">
                <WeatherIcon w={weather} size={20} />
                <span className="tabular-nums">{weather.temp}°</span>
              </span>
            ) : null}
          </p>
          <h1 className="truncate font-display text-[54px] font-semibold leading-[1.02] tracking-[-0.01em] md:text-[76px]">
            {title}
          </h1>
        </div>
      </header>
      <div className="mb-6 flex min-h-[8px] flex-wrap gap-2 px-1">
        {stats.map((st) => (
          <span
            key={st.label}
            className="rounded-full px-3 py-1 text-[14px] font-semibold tabular-nums text-ink"
            style={{ background: tint(color, 0.8) }}
          >
            {st.n} {st.label}
          </span>
        ))}
      </div>
    </>
  );
}

function Notice({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4 rounded-3xl bg-ground px-5 py-3.5 text-[15px] text-ink-2">
      <p>{children}</p>
      {onClose ? (
        <button type="button" onClick={onClose} className="font-medium text-accent">
          OK
        </button>
      ) : null}
    </div>
  );
}

function Section({
  title,
  count,
  action,
  children,
}: {
  title?: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 first:mt-0">
      {title ? (
        <div className="flex items-center justify-between px-3 pb-2.5">
          <h2 className="font-display text-[22px] font-semibold">
            {title}
            {count !== undefined ? (
              <span className="ms-2 inline-flex min-w-7 items-center justify-center rounded-full bg-ground px-2 align-[3px] font-sans text-[13px] font-bold text-ink-2">
                {count}
              </span>
            ) : null}
          </h2>
          {action}
        </div>
      ) : null}
      <ul className="overflow-hidden rounded-[26px] bg-white py-1.5 shadow-[0_2px_0_#f0e4d6]">
        {children}
      </ul>
    </section>
  );
}

function QuickAdd({
  onAdd,
  placeholder,
  color,
}: {
  onAdd: (title: string) => void;
  placeholder: string;
  color: string;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = value.trim();
        if (!t) return;
        onAdd(t);
        setValue("");
      }}
      className="mb-6 flex items-center gap-3 rounded-full border-[2.5px] bg-white py-2 ps-2 pe-5 transition-transform focus-within:scale-[1.01]"
      style={{ borderColor: tint(color, 0.45) }}
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-[24px] font-semibold leading-none text-white"
        style={{ background: color }}
        aria-hidden
      >
        +
      </span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3"
      />
    </form>
  );
}

const Empty = ({
  children,
  mood = "sit",
}: {
  children: React.ReactNode;
  mood?: "sit" | "cheer" | "hello" | "sleep";
}) => (
  <li className="flex items-center gap-3 px-4 py-4 text-[15px] text-ink-2">
    <Hoopoe mood={mood} size={64} className="hh-bob shrink-0" />
    <span>{children}</span>
  </li>
);

/** Today's appointments and calendar events, quietly, above the tasks. */
function TodayCalendar({
  ws,
  topLevel,
  colorOf,
  apptColor,
  onOpenAppt,
  onNewAppt,
}: {
  ws: WorkspaceApi;
  topLevel: Task[];
  colorOf: (t: Task) => string;
  apptColor: (a: Appointment) => string;
  onOpenAppt: (id: string) => void;
  onNewAppt: (date: string, start?: string) => void;
}) {
  const now = today();
  const { events } = useFeedEvents(ws.feeds, now, now);
  const items = (
    itemsByDay({
      from: now,
      to: now,
      tasks: topLevel.filter(() => false),
      appointments: ws.appointments,
      events,
      feeds: ws.feeds,
      colorOf,
      apptColor,
    }).get(now) ?? []
  ).filter((i) => i.kind !== "task");
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between px-3 pb-2.5">
        <h2 className="font-display text-[22px] font-semibold">On the calendar</h2>
        <button
          type="button"
          onClick={() => onNewAppt(now)}
          className="rounded-full px-2 text-[15px] font-semibold text-accent"
        >
          + Appointment
        </button>
      </div>
      <ul className="overflow-hidden rounded-[26px] bg-white py-1.5 shadow-[0_2px_0_#f0e4d6]">
        {items.length ? (
          items.map((i) => (
            <AgendaRow key={i.key} item={i} onOpen={() => i.kind === "appt" && onOpenAppt(i.id)} />
          ))
        ) : (
          <li className="px-5 py-3 text-[15px] text-ink-2">Nothing at a set time today.</li>
        )}
      </ul>
    </section>
  );
}

function TodayView({ ws, topLevel, row }: { ws: WorkspaceApi; topLevel: Task[]; row: RowFn }) {
  const now = today();
  const isToday = (t: Task) => t.planned_for === now || t.due_date === now;
  const isEarlier = (t: Task) =>
    !isToday(t) &&
    ((t.planned_for !== null && t.planned_for < now) || (t.due_date !== null && t.due_date < now));

  const todayOpen = topLevel.filter((t) => !t.done && isToday(t)).sort(byPosition);
  const earlier = topLevel.filter((t) => !t.done && isEarlier(t)).sort(byDue);
  const doneToday = topLevel.filter((t) => t.done && t.done_at && t.done_at.slice(0, 10) === now);
  const upNext = topLevel.filter((t) => !t.done && !isToday(t) && !isEarlier(t)).sort(byDue);

  const plan = (t: Task) => ws.patchTask(t.id, { planned_for: now });
  const planBtn = (t: Task) => (
    <button
      type="button"
      onClick={() => plan(t)}
      className="whitespace-nowrap rounded-full bg-accent-soft px-3 py-1 text-[13px] font-semibold text-accent transition-transform hover:scale-105 md:opacity-0 md:group-hover:opacity-100"
    >
      Do today
    </button>
  );

  return (
    <>
      <QuickAdd
        color={SMART.today}
        placeholder="New task for today"
        onAdd={(title) => ws.createTask({ title, planned_for: now })}
      />
      <Section>
        {todayOpen.length ? (
          todayOpen.map((t) => row(t))
        ) : (
          <Empty>
            {doneToday.length
              ? "Everything planned for today is done. Look at your garden!"
              : "Nothing planned. Add a task above, or pick one from below."}
          </Empty>
        )}
      </Section>

      {earlier.length ? (
        <Section
          title="From earlier"
          count={earlier.length}
          action={
            <button
              type="button"
              onClick={() => earlier.forEach(plan)}
              className="rounded-full px-2 text-[15px] font-semibold text-accent"
            >
              Move all to today
            </button>
          }
        >
          {earlier.map((t) => row(t, { action: planBtn(t) }))}
        </Section>
      ) : null}

      {upNext.length ? (
        <Section title="Up next" count={upNext.length}>
          {upNext.slice(0, 40).map((t) => row(t, { action: planBtn(t) }))}
        </Section>
      ) : null}

      {doneToday.length ? (
        <Section title="Done today" count={doneToday.length}>
          {doneToday.map((t) => row(t))}
        </Section>
      ) : null}
    </>
  );
}

function UpcomingView({ ws, topLevel, row }: { ws: WorkspaceApi; topLevel: Task[]; row: RowFn }) {
  const now = today();
  const dated = topLevel.filter((t) => !t.done && t.due_date && t.due_date >= now).sort(byDue);
  const groups = new Map<string, Task[]>();
  for (const t of dated) {
    const list = groups.get(t.due_date!) ?? [];
    list.push(t);
    groups.set(t.due_date!, list);
  }
  return (
    <>
      <QuickAdd
        color={SMART.upcoming}
        placeholder="New task due tomorrow"
        onAdd={(title) => {
          const d = new Date(`${now}T12:00:00Z`);
          d.setUTCDate(d.getUTCDate() + 1);
          ws.createTask({ title, due_date: d.toISOString().slice(0, 10) });
        }}
      />
      {groups.size === 0 ? (
        <Section>
          <Empty>No dates ahead. Give a task a due date and it will appear here.</Empty>
        </Section>
      ) : (
        Array.from(groups.entries()).map(([date, list]) => (
          <Section key={date} title={shortDate(date, now)} count={list.length}>
            {list.map((t) => row(t))}
          </Section>
        ))
      )}
    </>
  );
}

function ListView({
  ws,
  tasks,
  projectId,
  color,
  row,
  showProject = false,
  sort = byDue,
  addPlaceholder,
  addFields = {},
}: {
  ws: WorkspaceApi;
  tasks: Task[];
  projectId: string | null;
  color: string;
  row: RowFn;
  showProject?: boolean;
  sort?: (a: Task, b: Task) => number;
  addPlaceholder?: string;
  addFields?: Partial<Task>;
}) {
  const [showDone, setShowDone] = useState(false);
  const open = tasks.filter((t) => !t.done).sort(sort);
  const done = tasks
    .filter((t) => t.done)
    .sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));

  return (
    <>
      <QuickAdd
        color={color}
        placeholder={addPlaceholder ?? "New task"}
        onAdd={(title) => ws.createTask({ title, project_id: projectId, ...addFields })}
      />
      <Section>
        {open.length ? open.map((t) => row(t, { showProject })) : <Empty>No open tasks.</Empty>}
      </Section>
      {done.length ? (
        <Section
          title="Completed"
          count={done.length}
          action={
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              className="rounded-full px-2 text-[15px] font-semibold text-accent"
            >
              {showDone ? "Hide" : "Show"}
            </button>
          }
        >
          {showDone ? done.map((t) => row(t, { showProject })) : null}
        </Section>
      ) : null}
    </>
  );
}

function ProjectSettings({ ws, project }: { ws: WorkspaceApi; project: Project }) {
  const [name, setName] = useState(project.name);
  const [confirm, setConfirm] = useState(false);
  const current = projectColor(project);
  return (
    <div className="mt-12 flex flex-col gap-4 rounded-[26px] bg-ground p-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() =>
            name.trim() && name.trim() !== project.name && ws.renameProject(project.id, name.trim())
          }
          className="rounded-full bg-white px-4 py-2 text-[15px] outline-none"
          aria-label="Project name"
        />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Project colour">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={current === c}
              aria-label={c}
              onClick={() => ws.setProjectColor(project.id, c)}
              className="size-7 rounded-full transition-transform hover:scale-110"
              style={{
                background: c,
                boxShadow: current === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : undefined,
              }}
            />
          ))}
        </div>
      </div>
      <div className="text-[15px]">
        {confirm ? (
          <span className="flex gap-4">
            <button
              type="button"
              className="font-medium text-danger"
              onClick={() => {
                ws.archiveProject(project.id);
                window.location.href = "/";
              }}
            >
              Archive project
            </button>
            <button type="button" className="text-ink-2" onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="text-ink-3 hover:text-danger"
            onClick={() => setConfirm(true)}
          >
            Archive project…
          </button>
        )}
      </div>
    </div>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  ideas: (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
      <circle cx="5" cy="6" r="2.6" fill="#fff" />
      <circle cx="15" cy="5" r="2.2" fill="#fff" />
      <circle cx="10" cy="15" r="2.8" fill="#fff" />
      <path d="M6.8 7.6l2.4 5M13.6 6.6l-2.6 6.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
      <rect
        x="3"
        y="4"
        width="14"
        height="13"
        rx="2.5"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
      />
      <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="7" cy="11.5" r="1.1" fill="#fff" />
      <circle cx="10" cy="11.5" r="1.1" fill="#fff" />
      <circle cx="13" cy="11.5" r="1.1" fill="#fff" />
      <circle cx="7" cy="14.5" r="1.1" fill="#fff" />
    </svg>
  ),
  gantt: (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
      <path d="M3 5h8M6 10h9M4 15h6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  ),
  today: (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
      <rect
        x="3"
        y="4"
        width="14"
        height="13"
        rx="2.5"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
      />
      <path d="M3 8h14" stroke="#fff" strokeWidth="1.8" />
      <circle cx="10" cy="12.5" r="1.6" fill="#fff" />
    </svg>
  ),
  upcoming: (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
      <circle cx="10" cy="10" r="6.5" fill="none" stroke="#fff" strokeWidth="1.8" />
      <path
        d="M10 6.5V10l2.5 1.8"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
      <path
        d="M3.5 11 5.5 4.5h9l2 6.5v4.5h-13zM3.5 11h4l1 2h3l1-2h4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  ),
  flagged: (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
      <path d="M5 17V3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5.5 4h9.5l-2.4 3.5L15 11H5.5z" fill="#fff" />
    </svg>
  ),
};

function Sidebar({
  ws,
  view,
  open,
  collapsed,
  onClose,
}: {
  ws: WorkspaceApi;
  view: View;
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const now = today();
  const live = ws.tasks.filter((t) => !t.parent_id && !t.done);
  const ym = now.slice(0, 7);
  const counts = {
    today: live.filter(
      (t) =>
        t.planned_for === now ||
        t.due_date === now ||
        (t.planned_for !== null && t.planned_for < now) ||
        (t.due_date !== null && t.due_date < now),
    ).length,
    upcoming: live.filter((t) => t.due_date !== null && t.due_date >= now).length,
    inbox: live.filter((t) => t.project_id === null).length,
    flagged: live.filter((t) => t.priority > 0).length,
    calendar: live.filter((t) => (t.due_date ?? t.planned_for ?? "").startsWith(ym)).length,
    gantt: live.filter((t) => t.start_date || t.due_date || t.planned_for).length,
  };

  const tile = (kind: keyof typeof SMART, href: string, label: string) => {
    const active = view.kind === kind || (kind === "ideas" && view.kind === "board");
    return (
      <Link
        href={href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        className={`flex flex-col gap-3 rounded-[22px] p-3 transition-transform hover:-translate-y-0.5 ${
          active ? "text-white" : "text-ink"
        }`}
        style={{ background: active ? SMART[kind] : tint(SMART[kind], 0.78) }}
      >
        <span className="flex items-start justify-between">
          <span
            className="flex size-8 items-center justify-center rounded-full"
            style={{ background: active ? "rgba(255,255,255,0.3)" : SMART[kind] }}
          >
            {ICONS[kind]}
          </span>
          <span className="font-display text-[28px] font-semibold leading-none tabular-nums">
            {kind in counts ? counts[kind as keyof typeof counts] : null}
          </span>
        </span>
        <span className="text-[15px] font-bold">{label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-hidden={undefined}
      className={`fixed inset-0 z-40 flex shrink-0 origin-top flex-col overflow-hidden bg-ground transition-[scale,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] md:sticky md:inset-auto md:top-0 md:z-0 md:h-dvh md:w-[280px] md:scale-y-100 md:opacity-100 md:transition-none ${
        open
          ? "scale-y-100 opacity-100"
          : "pointer-events-none scale-y-0 opacity-0 md:pointer-events-auto"
      } ${collapsed ? "md:hidden" : ""}`}
    >
      <div
        className={`flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3.5 pb-8 pt-3 transition-opacity delay-200 duration-500 md:py-5 md:opacity-100 md:delay-0 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex h-[38px] items-center gap-2 ps-12">
          <Hoopoe mood="hello" size={44} />
          <span className="font-display text-[24px] font-semibold">Hudhud</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {tile("today", "/", "Today")}
          {tile("upcoming", "/upcoming", "Upcoming")}
          {tile("inbox", "/inbox", "Inbox")}
          {tile("flagged", "/flagged", "Flagged")}
          {tile("calendar", "/calendar", "Calendar")}
          {tile("gantt", "/gantt", "Timeline")}
          {tile("ideas", "/ideas", "Ideas")}
        </div>

        <ProjectList ws={ws} view={view} live={live} onClose={onClose} />

        <div>
          <p className="px-2 pb-1.5 font-display text-[21px] font-semibold">People</p>
          {TEAM.map((p) => {
            const active = view.kind === "person" && view.id === p.id;
            const n = live.filter((t) => (t.assignee ?? "jackie") === p.id).length;
            return (
              <Link
                key={p.id}
                href={`/people/${p.id}`}
                onClick={onClose}
                className={`flex h-11 items-center gap-3 rounded-full ps-2 pe-3 ${
                  active ? "bg-white" : "hover:bg-white/60"
                }`}
              >
                <span
                  className="flex size-7 items-center justify-center rounded-full font-display text-[15px] font-semibold text-white"
                  style={{ background: p.color }}
                >
                  {p.full[0]}
                </span>
                <span className={`flex-1 text-[15px] ${active ? "font-semibold" : ""}`}>
                  {p.id === "jackie" ? "Me" : p.full}
                </span>
                {n ? (
                  <span
                    className="min-w-6 rounded-full px-1.5 text-center text-[13px] font-bold tabular-nums"
                    style={{ background: tint(p.color, 0.8) }}
                  >
                    {n}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        <div>
          {adding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const n = name.trim();
                if (n) ws.createProject(n);
                setName("");
                setAdding(false);
              }}
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => !name.trim() && setAdding(false)}
                placeholder="Project name"
                className="w-full rounded-full bg-white px-4 py-2 text-[15px] outline-none"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-2 py-1 text-[15px] font-semibold text-accent"
            >
              <span className="text-[20px] leading-none">+</span> Add project
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

const ROW_H = 44;

/** Projects, A to Z or in your own order. In your order, drag the dots to move one. */
function ProjectList({
  ws,
  view,
  live,
  onClose,
}: {
  ws: WorkspaceApi;
  view: View;
  live: Task[];
  onClose: () => void;
}) {
  const [sort, setSort] = useState<"mine" | "az">("mine");
  const [drag, setDrag] = useState<{ id: string; startY: number; dy: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem("pm-project-sort") === "az") setSort("az");
    } catch {}
  }, []);
  const choose = (v: "mine" | "az") => {
    setSort(v);
    try {
      localStorage.setItem("pm-project-sort", v);
    } catch {}
  };

  const mine = [...ws.projects].sort((a, b) => a.position - b.position);
  const list =
    sort === "az"
      ? [...ws.projects].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }))
      : mine;

  // While dragging, show the order it would drop into.
  let shown = list;
  let dragIndex = -1;
  let target = -1;
  if (drag && sort === "mine") {
    dragIndex = list.findIndex((p) => p.id === drag.id);
    target = Math.max(0, Math.min(list.length - 1, dragIndex + Math.round(drag.dy / ROW_H)));
    shown = [...list];
    const [moved] = shown.splice(dragIndex, 1);
    shown.splice(target, 0, moved!);
  }

  const move = (id: string, by: number) => {
    const ids = mine.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = Math.max(0, Math.min(ids.length - 1, i + by));
    if (i === j) return;
    ids.splice(j, 0, ids.splice(i, 1)[0]!);
    ws.reorderProjects(ids);
  };

  return (
    <div>
      <div className="flex items-center justify-between px-2 pb-1.5">
        <p className="font-display text-[21px] font-semibold">Projects</p>
        <div
          className="flex rounded-full bg-white p-0.5 text-[13px] font-bold"
          role="radiogroup"
          aria-label="Sort projects"
        >
          {(
            [
              ["mine", "My order"],
              ["az", "A–Z"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={sort === v}
              onClick={() => choose(v)}
              className={`rounded-full px-2.5 py-1 transition-colors ${
                sort === v ? "bg-ink text-white" : "text-ink-2"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div ref={listRef} className="relative flex flex-col">
        {shown.map((p) => {
          const active = view.kind === "project" && view.id === p.id;
          const color = projectColor(p);
          const n = live.filter((t) => t.project_id === p.id).length;
          const dragging = drag?.id === p.id;
          return (
            <div
              key={p.id}
              className={`group flex items-center rounded-full transition-colors ${
                active ? "bg-white" : "hover:bg-white/60"
              } ${dragging ? "z-10 bg-white shadow-[0_6px_18px_rgba(43,34,56,0.15)]" : ""}`}
              style={{ height: ROW_H }}
            >
              <Link
                href={`/p/${p.id}`}
                onClick={onClose}
                className="flex min-w-0 flex-1 items-center gap-3 ps-2"
                draggable={false}
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full"
                  style={{ background: color }}
                >
                  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden>
                    <circle cx="4" cy="4.5" r="1.2" fill="#fff" />
                    <circle cx="4" cy="8" r="1.2" fill="#fff" />
                    <circle cx="4" cy="11.5" r="1.2" fill="#fff" />
                    <path
                      d="M7 4.5h6M7 8h6M7 11.5h6"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className={`flex-1 truncate text-[15px] ${active ? "font-semibold" : ""}`}>
                  {p.name}
                </span>
                {n ? (
                  <span
                    className="me-1 min-w-6 rounded-full px-1.5 text-center text-[13px] font-bold tabular-nums"
                    style={{ background: tint(color, 0.8), color: "#2B2238" }}
                  >
                    {n}
                  </span>
                ) : null}
              </Link>
              {sort === "mine" ? (
                <button
                  type="button"
                  aria-label={`Move ${p.name}. Drag, or use the arrow keys.`}
                  className="flex h-full w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-ink-3 active:cursor-grabbing"
                  onPointerDown={(e) => {
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    setDrag({ id: p.id, startY: e.clientY, dy: 0 });
                  }}
                  onPointerMove={(e) =>
                    setDrag((d) => (d && d.id === p.id ? { ...d, dy: e.clientY - d.startY } : d))
                  }
                  onPointerUp={() => {
                    if (drag && target >= 0 && target !== dragIndex)
                      ws.reorderProjects(shown.map((x) => x.id));
                    setDrag(null);
                  }}
                  onPointerCancel={() => setDrag(null)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      move(p.id, -1);
                    }
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      move(p.id, 1);
                    }
                  }}
                >
                  <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden>
                    {[3, 8, 13].map((y) => (
                      <g key={y}>
                        <circle cx="2.5" cy={y} r="1.5" fill="currentColor" />
                        <circle cx="7.5" cy={y} r="1.5" fill="currentColor" />
                      </g>
                    ))}
                  </svg>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
