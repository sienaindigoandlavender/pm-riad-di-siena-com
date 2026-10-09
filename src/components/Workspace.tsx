"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PROJECT_COLORS, SMART, projectColor } from "@/lib/colors";
import { longDate, shortDate, today } from "@/lib/dates";
import type { Project, Task } from "@/lib/types";
import { TaskPanel } from "./TaskPanel";
import { TaskRow } from "./TaskRow";
import { useWorkspace, type WorkspaceApi } from "./useWorkspace";

export type View =
  | { kind: "today" }
  | { kind: "upcoming" }
  | { kind: "inbox" }
  | { kind: "flagged" }
  | { kind: "project"; id: string };

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
}: {
  view: View;
  initial: { projects: Project[]; tasks: Task[] };
  setupNeeded?: boolean;
  loadError?: string;
}) {
  const ws = useWorkspace(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const open = ws.tasks.find((t) => t.id === openId) ?? null;
  const projectById = useMemo(() => new Map(ws.projects.map((p) => [p.id, p])), [ws.projects]);
  const colorOf = (t: Task) =>
    projectColor(t.project_id ? projectById.get(t.project_id) : undefined);

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
            : { title: project?.name ?? "Project", color: projectColor(project) };

  return (
    <div className="flex min-h-dvh">
      <Sidebar ws={ws} view={view} open={menu} onClose={() => setMenu(false)} />

      <main className={`min-w-0 flex-1 ${open ? "md:me-[440px]" : ""}`}>
        <div className="sticky top-0 z-10 flex items-center border-b border-line-soft bg-white/85 px-4 py-2.5 backdrop-blur-xl md:hidden">
          <button
            type="button"
            className="p-1"
            onClick={() => setMenu(true)}
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="#4A6B85"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mx-auto max-w-[760px] px-2 pb-28 pt-6 md:px-10 md:pt-12">
          <Heading
            view={view}
            title={heading.title}
            color={heading.color}
            ws={ws}
            topLevel={topLevel}
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

          {view.kind === "today" ? (
            <TodayView ws={ws} topLevel={topLevel} row={row} />
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
    </div>
  );
}

/** The big coloured title. On Today, a ring fills as the day's tasks get done. */
function Heading({
  view,
  title,
  color,
  topLevel,
}: {
  view: View;
  title: string;
  color: string;
  ws: WorkspaceApi;
  topLevel: Task[];
}) {
  const now = today();
  let ring: { done: number; total: number } | null = null;
  if (view.kind === "today") {
    const mine = topLevel.filter(
      (t) =>
        t.planned_for === now ||
        t.due_date === now ||
        (t.done && t.done_at !== null && t.done_at.slice(0, 10) === now),
    );
    ring = { done: mine.filter((t) => t.done).length, total: mine.length };
  }
  return (
    <header className="mb-6 flex items-end justify-between gap-4 px-4">
      <div className="min-w-0">
        {view.kind === "today" ? (
          <p className="text-[15px] font-medium text-ink-3">{longDate(now)}</p>
        ) : null}
        <h1
          className="truncate text-[40px] font-bold leading-[1.05] tracking-[-0.025em] md:text-[48px]"
          style={{ color }}
        >
          {title}
        </h1>
      </div>
      {ring && ring.total > 0 ? <Ring {...ring} color={color} /> : null}
    </header>
  );
}

function Ring({ done, total, color }: { done: number; total: number; color: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="text-end">
        <p className="text-[22px] font-bold leading-none tabular-nums">
          {done}
          <span className="text-ink-3">/{total}</span>
        </p>
        <p className="mt-1 text-[13px] text-ink-3">{done === total ? "All done" : "done"}</p>
      </div>
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#E9E7E2" strokeWidth="6" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 500ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
    </div>
  );
}

function Notice({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="mx-4 mb-5 flex items-start justify-between gap-4 rounded-[12px] bg-ground px-4 py-3 text-[15px] text-ink-2">
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
    <section className="mt-9 first:mt-0">
      {title ? (
        <div className="flex items-baseline justify-between border-b border-line px-4 pb-2">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
            {title}
            {count !== undefined ? (
              <span className="ms-2 font-normal text-ink-3">{count}</span>
            ) : null}
          </h2>
          {action}
        </div>
      ) : null}
      <ul>{children}</ul>
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
      className="mb-2 flex items-center gap-3.5 px-4 py-2"
    >
      <span
        className="flex size-[22px] shrink-0 items-center justify-center rounded-full text-[18px] font-medium leading-none text-white"
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

const Empty = ({ children }: { children: React.ReactNode }) => (
  <li className="px-4 py-8 text-[15px] text-ink-3">{children}</li>
);

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
      className="rounded-full bg-accent-soft px-3 py-1 text-[13px] font-medium text-accent md:opacity-0 md:group-hover:opacity-100"
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
              ? "Everything planned for today is done."
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
              className="text-[15px] text-accent"
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
              className="text-[15px] text-accent"
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
    <div className="mx-4 mt-16 flex flex-col gap-4 border-t border-line pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() =>
            name.trim() && name.trim() !== project.name && ws.renameProject(project.id, name.trim())
          }
          className="rounded-[10px] bg-ground px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-accent"
          aria-label="Project name"
        />
        <div className="flex gap-2" role="radiogroup" aria-label="Project colour">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={current === c}
              aria-label={c}
              onClick={() => ws.setProjectColor(project.id, c)}
              className="size-6 rounded-full"
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
  onClose,
}: {
  ws: WorkspaceApi;
  view: View;
  open: boolean;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const now = today();
  const live = ws.tasks.filter((t) => !t.parent_id && !t.done);
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
  };

  const tile = (kind: keyof typeof SMART, href: string, label: string) => {
    const active = view.kind === kind;
    return (
      <Link
        href={href}
        onClick={onClose}
        className={`flex flex-col gap-2 rounded-[12px] p-2.5 transition-colors ${
          active ? "text-white" : "bg-white text-ink hover:bg-white/70"
        }`}
        style={active ? { background: SMART[kind] } : undefined}
      >
        <span className="flex items-start justify-between">
          <span
            className="flex size-7 items-center justify-center rounded-full"
            style={{ background: active ? "rgba(255,255,255,0.25)" : SMART[kind] }}
          >
            {ICONS[kind]}
          </span>
          <span className="text-[22px] font-bold leading-none tabular-nums">{counts[kind]}</span>
        </span>
        <span className={`text-[14px] font-semibold ${active ? "text-white" : "text-ink-2"}`}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <>
      {open ? <div className="fixed inset-0 z-30 bg-black/25 md:hidden" onClick={onClose} /> : null}
      <nav
        className={`fixed inset-y-0 start-0 z-40 w-[280px] shrink-0 flex-col gap-6 overflow-y-auto border-e border-line-soft bg-ground px-3.5 py-5 md:sticky md:top-0 md:z-0 md:flex md:h-dvh ${
          open ? "flex" : "hidden"
        }`}
      >
        <div className="grid grid-cols-2 gap-2.5">
          {tile("today", "/", "Today")}
          {tile("upcoming", "/upcoming", "Upcoming")}
          {tile("inbox", "/inbox", "Inbox")}
          {tile("flagged", "/flagged", "Flagged")}
        </div>

        <div>
          <p className="px-2 pb-1.5 text-[19px] font-bold tracking-[-0.01em]">Projects</p>
          <div className="flex flex-col">
            {ws.projects.map((p) => {
              const active = view.kind === "project" && view.id === p.id;
              const color = projectColor(p);
              const n = live.filter((t) => t.project_id === p.id).length;
              return (
                <Link
                  key={p.id}
                  href={`/p/${p.id}`}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-[10px] px-2 py-2 ${
                    active ? "bg-white" : "hover:bg-white/60"
                  }`}
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
                  {n ? <span className="text-[15px] text-ink-3 tabular-nums">{n}</span> : null}
                </Link>
              );
            })}
          </div>
          {adding ? (
            <form
              className="mt-1"
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
                className="w-full rounded-[10px] bg-white px-3 py-2 text-[15px] outline-none ring-2 ring-accent"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-1 flex items-center gap-2 px-2 py-2 text-[15px] font-medium text-accent"
            >
              <span className="text-[20px] leading-none">+</span> Add project
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
