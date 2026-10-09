"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { longDate, today } from "@/lib/dates";
import type { Project, Task } from "@/lib/types";
import { TaskPanel } from "./TaskPanel";
import { TaskRow } from "./TaskRow";
import { useWorkspace, type WorkspaceApi } from "./useWorkspace";

export type View = { kind: "today" } | { kind: "inbox" } | { kind: "project"; id: string };

const byPosition = (a: Task, b: Task) => a.position - b.position;
const byDue = (a: Task, b: Task) =>
  (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.position - b.position;

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

  const topLevel = ws.tasks.filter((t) => !t.parent_id);
  const subCount = (id: string) => {
    const subs = ws.tasks.filter((t) => t.parent_id === id);
    return { done: subs.filter((s) => s.done).length, total: subs.length };
  };

  const row = (t: Task, opts: { showProject?: boolean; action?: React.ReactNode } = {}) => (
    <TaskRow
      key={t.id}
      task={t}
      project={t.project_id ? projectById.get(t.project_id) : undefined}
      subtasks={subCount(t.id)}
      selected={t.id === openId}
      showProject={opts.showProject ?? true}
      onToggle={() => ws.patchTask(t.id, { done: !t.done })}
      onOpen={() => setOpenId(t.id)}
      action={opts.action}
    />
  );

  const title =
    view.kind === "today"
      ? "Today"
      : view.kind === "inbox"
        ? "Inbox"
        : (projectById.get(view.id)?.name ?? "Project");

  return (
    <div className="flex min-h-dvh">
      <Sidebar ws={ws} view={view} open={menu} onClose={() => setMenu(false)} />

      <main className={`min-w-0 flex-1 ${open ? "md:me-[420px]" : ""}`}>
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line-soft bg-white/90 px-5 py-3 backdrop-blur md:px-10">
          <button
            type="button"
            className="-ms-1 p-1 md:hidden"
            onClick={() => setMenu(true)}
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold tracking-[-0.01em]">{title}</h1>
            {view.kind === "today" ? (
              <p className="text-[13px] text-ink-3">{longDate(today())}</p>
            ) : null}
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-2 pb-24 pt-4 md:px-8">
          {setupNeeded ? (
            <Notice>
              The database isn&apos;t connected yet. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>SUPABASE_SERVICE_ROLE_KEY</code> in Vercel, then run{" "}
              <code>supabase/pm-setup.sql</code>.
            </Notice>
          ) : null}
          {loadError ? <Notice>Couldn&apos;t load: {loadError}</Notice> : null}
          {ws.error ? (
            <Notice onClose={ws.clearError}>A change didn&apos;t save: {ws.error}</Notice>
          ) : null}

          {view.kind === "today" ? (
            <TodayView ws={ws} topLevel={topLevel} row={row} />
          ) : (
            <ListView
              ws={ws}
              tasks={topLevel.filter((t) =>
                view.kind === "inbox" ? t.project_id === null : t.project_id === view.id,
              )}
              projectId={view.kind === "project" ? view.id : null}
              row={row}
            />
          )}
        </div>
      </main>

      {open ? <TaskPanel task={open} ws={ws} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

type RowFn = (
  t: Task,
  opts?: { showProject?: boolean; action?: React.ReactNode },
) => React.ReactNode;

function Notice({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="mx-3 mb-4 flex items-start justify-between gap-4 rounded-[10px] border border-line bg-panel px-4 py-3 text-[14px] text-ink-2">
      <p>{children}</p>
      {onClose ? (
        <button type="button" onClick={onClose} className="text-accent">
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
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 first:mt-2">
      <div className="flex items-baseline justify-between px-3 pb-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-2">
          {title}
          {count !== undefined ? (
            <span className="ms-2 font-normal text-ink-3">{count}</span>
          ) : null}
        </h2>
        {action}
      </div>
      <ul className="border-t border-line-soft">{children}</ul>
    </section>
  );
}

function QuickAdd({ onAdd, placeholder }: { onAdd: (title: string) => void; placeholder: string }) {
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
      className="mx-3 flex items-center gap-3 rounded-[10px] border border-line px-3 py-2.5 focus-within:border-accent"
    >
      <span
        className="flex size-5 items-center justify-center text-[20px] leading-none text-accent"
        aria-hidden
      >
        +
      </span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none placeholder:text-ink-3"
      />
    </form>
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
  const doneToday = topLevel.filter((t) => t.done && t.done_at && t.done_at.slice(0, 10) >= now);
  const upNext = topLevel.filter((t) => !t.done && !isToday(t) && !isEarlier(t)).sort(byDue);

  const plan = (t: Task) => ws.patchTask(t.id, { planned_for: now });
  const planBtn = (t: Task) => (
    <button
      type="button"
      onClick={() => plan(t)}
      className="rounded-full border border-line px-2.5 py-0.5 text-[13px] text-ink-2 opacity-100 hover:border-ink md:opacity-0 md:group-hover:opacity-100"
    >
      Today
    </button>
  );

  return (
    <>
      <QuickAdd
        placeholder="Add a task for today"
        onAdd={(title) => ws.createTask({ title, planned_for: now })}
      />

      <Section title="Today" count={todayOpen.length}>
        {todayOpen.length ? (
          todayOpen.map((t) => row(t))
        ) : (
          <li className="px-3 py-6 text-ink-3">
            {doneToday.length
              ? "All done for today."
              : "Nothing planned yet. Add a task, or pull one from below."}
          </li>
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
              className="text-[13px] text-accent"
            >
              Move all to today
            </button>
          }
        >
          {earlier.map((t) => row(t, { action: planBtn(t) }))}
        </Section>
      ) : null}

      {doneToday.length ? (
        <Section title="Done today" count={doneToday.length}>
          {doneToday.map((t) => row(t))}
        </Section>
      ) : null}

      {upNext.length ? (
        <Section title="Up next" count={upNext.length}>
          {upNext.slice(0, 50).map((t) => row(t, { action: planBtn(t) }))}
        </Section>
      ) : null}
    </>
  );
}

function ListView({
  ws,
  tasks,
  projectId,
  row,
}: {
  ws: WorkspaceApi;
  tasks: Task[];
  projectId: string | null;
  row: RowFn;
}) {
  const [showDone, setShowDone] = useState(false);
  const open = tasks.filter((t) => !t.done).sort(byDue);
  const done = tasks
    .filter((t) => t.done)
    .sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
  const project = projectId ? ws.projects.find((p) => p.id === projectId) : null;

  return (
    <>
      <QuickAdd
        placeholder={project ? `Add a task to ${project.name}` : "Add to Inbox"}
        onAdd={(title) => ws.createTask({ title, project_id: projectId })}
      />
      <Section title="Open" count={open.length}>
        {open.length ? (
          open.map((t) => row(t, { showProject: false }))
        ) : (
          <li className="px-3 py-6 text-ink-3">No open tasks.</li>
        )}
      </Section>
      {done.length ? (
        <Section
          title="Completed"
          count={done.length}
          action={
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              className="text-[13px] text-accent"
            >
              {showDone ? "Hide" : "Show"}
            </button>
          }
        >
          {showDone ? done.map((t) => row(t, { showProject: false })) : null}
        </Section>
      ) : null}
      {project ? <ProjectSettings ws={ws} project={project} /> : null}
    </>
  );
}

function ProjectSettings({ ws, project }: { ws: WorkspaceApi; project: Project }) {
  const [name, setName] = useState(project.name);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="mx-3 mt-12 flex flex-wrap items-center gap-4 border-t border-line-soft pt-4 text-[14px]">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() =>
          name.trim() && name.trim() !== project.name && ws.renameProject(project.id, name.trim())
        }
        className="rounded-[8px] border border-line px-3 py-1.5 outline-none focus:border-accent"
        aria-label="Project name"
      />
      {confirm ? (
        <>
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
        </>
      ) : (
        <button
          type="button"
          className="text-ink-3 hover:text-danger"
          onClick={() => setConfirm(true)}
        >
          Archive…
        </button>
      )}
    </div>
  );
}

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
  const todayCount = live.filter(
    (t) =>
      t.planned_for === now ||
      t.due_date === now ||
      (t.planned_for !== null && t.planned_for < now) ||
      (t.due_date !== null && t.due_date < now),
  ).length;
  const inboxCount = live.filter((t) => t.project_id === null).length;

  const item = (href: string, label: string, count: number, active: boolean) => (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center justify-between rounded-[8px] px-3 py-1.5 ${
        active ? "bg-line-soft font-medium text-ink" : "text-ink-2 hover:bg-line-soft/60"
      }`}
    >
      <span className="truncate">{label}</span>
      {count ? <span className="text-[13px] text-ink-3">{count}</span> : null}
    </Link>
  );

  return (
    <>
      {open ? <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={onClose} /> : null}
      <nav
        className={`fixed inset-y-0 start-0 z-40 w-[260px] shrink-0 flex-col border-e border-line-soft bg-panel px-3 py-4 md:sticky md:top-0 md:z-0 md:flex md:h-dvh ${
          open ? "flex" : "hidden"
        }`}
      >
        <p className="px-3 pb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Tasks
        </p>
        <div className="flex flex-col gap-0.5">
          {item("/", "Today", todayCount, view.kind === "today")}
          {item("/inbox", "Inbox", inboxCount, view.kind === "inbox")}
        </div>

        <p className="mt-7 px-3 pb-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">
          Projects
        </p>
        <div className="flex flex-col gap-0.5 overflow-y-auto">
          {ws.projects.map((p) =>
            item(
              `/p/${p.id}`,
              p.name,
              live.filter((t) => t.project_id === p.id).length,
              view.kind === "project" && view.id === p.id,
            ),
          )}
        </div>
        {adding ? (
          <form
            className="mt-1 px-1"
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
              className="w-full rounded-[8px] border border-accent bg-white px-2 py-1.5 outline-none"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-1 px-3 py-1.5 text-start text-accent"
          >
            New project
          </button>
        )}
      </nav>
    </>
  );
}
