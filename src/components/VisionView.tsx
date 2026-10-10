"use client";

// Vision & roadmap: the vision in her own words at the top, then goals placed on
// four horizons (now → in 3 years). Goals link to projects, so the roadmap shows
// what is moving each one forward, and carry dated milestones. Saves itself.
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SMART, projectColor } from "@/lib/colors";
import { shortDate, today } from "@/lib/dates";
import type { Project, Task } from "@/lib/types";
import { HORIZONS, type Goal, type HorizonKey, type Milestone, type Vision } from "@/lib/vision";
import { tint } from "./HeroScene";

const C = SMART.vision;
const uid = () => crypto.randomUUID();

function AutoText({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full resize-none bg-transparent outline-none placeholder:text-ink-3 ${className ?? ""}`}
    />
  );
}

function GoalCard({
  goal,
  projects,
  openCount,
  onChange,
  onDelete,
}: {
  goal: Goal;
  projects: Project[];
  openCount: (projectId: string) => number;
  onChange: (g: Goal) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(!goal.title);
  const [ms, setMs] = useState({ title: "", date: "" });
  const linked = projects.filter((p) => goal.project_ids.includes(p.id));
  const set = (patch: Partial<Goal>) => onChange({ ...goal, ...patch });
  const setMilestone = (id: string, patch: Partial<Milestone>) =>
    set({ milestones: goal.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const sortedMs = [...goal.milestones].sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));

  return (
    <div className="rounded-[24px] bg-white p-4 shadow-[0_1px_0_rgba(43,34,56,0.06)]">
      {open ? (
        <input
          autoFocus={!goal.title}
          value={goal.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="A goal…"
          className="w-full bg-transparent font-display text-[18px] font-semibold text-ink outline-none placeholder:text-ink-3"
        />
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="w-full text-start font-display text-[18px] font-semibold leading-snug text-ink">
          {goal.title || "Untitled goal"}
        </button>
      )}

      {linked.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {linked.map((p) => {
            const n = openCount(p.id);
            return (
              <Link
                key={p.id}
                href={`/p/${p.id}`}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold text-ink"
                style={{ background: tint(projectColor(p), 0.8) }}
              >
                <span className="size-2 rounded-full" style={{ background: projectColor(p) }} />
                {p.name}
                {n ? <span className="text-ink-2">· {n} open</span> : null}
              </Link>
            );
          })}
        </div>
      ) : null}

      {sortedMs.length ? (
        <ul className="mt-3 space-y-1.5">
          {sortedMs.map((m) => (
            <li key={m.id} className="flex items-start gap-2 text-[14px]">
              <button
                type="button"
                onClick={() => setMilestone(m.id, { done: !m.done })}
                aria-label={m.done ? "Mark not reached" : "Mark reached"}
                className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2"
                style={{ borderColor: C, background: m.done ? C : "transparent" }}
              >
                {m.done ? <span className="text-[11px] leading-none text-white">✓</span> : null}
              </button>
              <span className={`flex-1 ${m.done ? "text-ink-3 line-through" : "text-ink"}`}>{m.title}</span>
              {m.date ? <span className="shrink-0 text-[13px] font-semibold text-ink-2">{shortDate(m.date)}</span> : null}
              {open ? (
                <button type="button" onClick={() => set({ milestones: goal.milestones.filter((x) => x.id !== m.id) })} className="text-[13px] text-ink-3" aria-label="Remove milestone">
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <div className="mt-3 space-y-3 border-t border-line-soft pt-3">
          <AutoText value={goal.notes} onChange={(notes) => set({ notes })} placeholder="Why it matters, what it looks like…" className="text-[15px] text-ink" />

          <form
            className="flex flex-wrap items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!ms.title.trim()) return;
              set({ milestones: [...goal.milestones, { id: uid(), title: ms.title.trim(), date: ms.date || null, done: false }] });
              setMs({ title: "", date: "" });
            }}
          >
            <input
              value={ms.title}
              onChange={(e) => setMs({ ...ms, title: e.target.value })}
              placeholder="Add a milestone"
              className="min-w-[120px] flex-1 rounded-full bg-ground px-3 py-1.5 text-[14px] outline-none"
            />
            <input type="date" value={ms.date} onChange={(e) => setMs({ ...ms, date: e.target.value })} className="rounded-full bg-ground px-2 py-1.5 text-[13px] text-ink-2 outline-none" />
            <button className="rounded-full px-3 py-1.5 text-[13px] font-bold text-white" style={{ background: C }}>Add</button>
          </form>

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Projects moving it forward</p>
            <div className="flex flex-wrap gap-1.5">
              {projects.filter((p) => !p.archived).map((p) => {
                const on = goal.project_ids.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => set({ project_ids: on ? goal.project_ids.filter((x) => x !== p.id) : [...goal.project_ids, p.id] })}
                    className="rounded-full px-2.5 py-1 text-[13px] font-semibold"
                    style={on ? { background: projectColor(p), color: "#fff" } : { background: tint(projectColor(p), 0.85), color: "#2b2238" }}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={goal.horizon}
              onChange={(e) => set({ horizon: e.target.value as HorizonKey })}
              className="rounded-full bg-ground px-3 py-1.5 text-[13px] font-semibold text-ink-2 outline-none"
            >
              {HORIZONS.map((h) => (
                <option key={h.key} value={h.key}>{h.label}</option>
              ))}
            </select>
            <button type="button" onClick={() => set({ reached: true })} className="rounded-full bg-ground px-3 py-1.5 text-[13px] font-semibold text-ink-2">
              Reached it
            </button>
            <button type="button" onClick={() => confirm("Remove this goal?") && onDelete()} className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-danger">
              Remove
            </button>
            <button type="button" onClick={() => setOpen(false)} className="ms-auto rounded-full px-3 py-1.5 text-[13px] font-bold text-white" style={{ background: C }}>
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function VisionView({ projects, tasks }: { projects: Project[]; tasks: Task[] }) {
  const [vision, setVision] = useState<Vision | null>(null);
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved");
  const [adding, setAdding] = useState<Record<string, string>>({});
  const last = useRef("");

  useEffect(() => {
    fetch("/api/vision")
      .then((r) => r.json())
      .then((d) => {
        last.current = JSON.stringify(d.vision);
        setVision(d.vision);
      })
      .catch(() => setVision({ statement: "", goals: [] }));
  }, []);

  const snapshot = vision ? JSON.stringify(vision) : "";
  useEffect(() => {
    if (!vision || snapshot === last.current) return;
    setSaved("saving");
    const t = setTimeout(() => {
      last.current = snapshot;
      fetch("/api/vision", { method: "PUT", headers: { "Content-Type": "application/json" }, body: snapshot })
        .then((r) => setSaved(r.ok ? "saved" : "error"))
        .catch(() => setSaved("error"));
    }, 700);
    return () => clearTimeout(t);
  }, [snapshot, vision]);

  const openByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) if (!t.done && !t.parent_id && t.project_id) m.set(t.project_id, (m.get(t.project_id) ?? 0) + 1);
    return m;
  }, [tasks]);

  if (!vision) return <p className="px-2 text-[15px] text-ink-2">Opening your vision…</p>;

  const update = (patch: Partial<Vision>) => setVision({ ...vision, ...patch });
  const setGoal = (g: Goal) => update({ goals: vision.goals.map((x) => (x.id === g.id ? g : x)) });
  const addGoal = (horizon: HorizonKey) => {
    const title = (adding[horizon] ?? "").trim();
    if (!title) return;
    update({ goals: [...vision.goals, { id: uid(), title, notes: "", horizon, project_ids: [], milestones: [], reached: false }] });
    setAdding({ ...adding, [horizon]: "" });
  };

  const now = today();
  const ahead = vision.goals
    .filter((g) => !g.reached)
    .flatMap((g) => g.milestones.filter((m) => !m.done && m.date).map((m) => ({ m, g })))
    .sort((a, b) => a.m.date!.localeCompare(b.m.date!))
    .slice(0, 6);
  const reached = vision.goals.filter((g) => g.reached);

  return (
    <div>
      <section className="rounded-[30px] p-6 md:p-8" style={{ background: tint(C, 0.86) }}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-[20px] font-semibold text-ink">My vision</h2>
          <span className="text-[13px] font-semibold text-ink-2" aria-live="polite">
            {saved === "saving" ? "Saving…" : saved === "error" ? "Not saved, will retry" : "Saved"}
          </span>
        </div>
        <AutoText
          value={vision.statement}
          onChange={(statement) => update({ statement })}
          placeholder="Where are you going? Write it as if it's already true."
          className="font-display text-[22px] font-medium leading-snug text-ink md:text-[26px]"
        />
      </section>

      {ahead.length ? (
        <section className="mt-8">
          <h2 className="px-1 pb-2.5 font-display text-[22px] font-semibold">Milestones ahead</h2>
          <ul className="space-y-1.5">
            {ahead.map(({ m, g }) => (
              <li key={m.id} className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 text-[15px]">
                <span className={`w-[70px] shrink-0 text-[13px] font-bold ${m.date! < now ? "text-danger" : "text-ink-2"}`}>{shortDate(m.date!)}</span>
                <span className="flex-1 font-semibold text-ink">{m.title}</span>
                <span className="hidden truncate text-[13px] text-ink-2 sm:block">{g.title}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {HORIZONS.map((h) => {
          const goals = vision.goals.filter((g) => g.horizon === h.key && !g.reached);
          return (
            <div key={h.key} className="rounded-[28px] bg-ground p-3">
              <div className="px-2 pb-3 pt-1">
                <h2 className="font-display text-[20px] font-semibold text-ink">{h.label}</h2>
                <p className="text-[13px] text-ink-2">{h.hint}</p>
              </div>
              <div className="space-y-2.5">
                {goals.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    projects={projects}
                    openCount={(id) => openByProject.get(id) ?? 0}
                    onChange={setGoal}
                    onDelete={() => update({ goals: vision.goals.filter((x) => x.id !== g.id) })}
                  />
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addGoal(h.key);
                }}
                className="mt-2.5"
              >
                <input
                  value={adding[h.key] ?? ""}
                  onChange={(e) => setAdding({ ...adding, [h.key]: e.target.value })}
                  placeholder="+ Add a goal"
                  className="w-full rounded-full bg-white/70 px-4 py-2 text-[15px] outline-none placeholder:font-semibold placeholder:text-ink-2 focus:bg-white"
                />
              </form>
            </div>
          );
        })}
      </section>

      {reached.length ? (
        <section className="mt-10">
          <h2 className="px-1 pb-2.5 font-display text-[22px] font-semibold">Reached</h2>
          <ul className="space-y-1.5">
            {reached.map((g) => (
              <li key={g.id} className="flex items-center gap-3 rounded-full bg-white px-4 py-2.5 text-[15px]">
                <span className="flex size-5 items-center justify-center rounded-full text-[11px] text-white" style={{ background: C }}>✓</span>
                <span className="flex-1 text-ink-2">{g.title}</span>
                <button type="button" onClick={() => setGoal({ ...g, reached: false })} className="text-[13px] font-semibold text-accent">
                  Bring back
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
