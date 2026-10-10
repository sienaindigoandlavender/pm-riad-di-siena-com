// The vision & roadmap lives in one document (kept in pm_boards under a fixed id, so
// no extra table is needed).
export const VISION_ID = "00000000-0000-4000-8000-000000000001";

export const HORIZONS = [
  { key: "now", label: "Now", hint: "This month" },
  { key: "soon", label: "Next 3 months", hint: "This season" },
  { key: "year", label: "This year", hint: "By December" },
  { key: "dream", label: "In 3 years", hint: "Where it's all going" },
] as const;
export type HorizonKey = (typeof HORIZONS)[number]["key"];

export type Milestone = { id: string; title: string; date: string | null; done: boolean };
export type Goal = {
  id: string;
  title: string;
  notes: string;
  horizon: HorizonKey;
  project_ids: string[];
  milestones: Milestone[];
  reached: boolean;
};
export type Vision = { statement: string; goals: Goal[] };

export const EMPTY_VISION: Vision = { statement: "", goals: [] };

/** Keep only well-formed fields (the document comes from the browser). */
export function cleanVision(v: unknown): Vision {
  const o = (v ?? {}) as Record<string, unknown>;
  const keys = HORIZONS.map((h) => h.key) as string[];
  const goals = Array.isArray(o.goals) ? o.goals : [];
  return {
    statement: String(o.statement ?? "").slice(0, 4000),
    goals: goals.slice(0, 200).map((g: Record<string, unknown>) => ({
      id: String(g.id),
      title: String(g.title ?? "").slice(0, 200),
      notes: String(g.notes ?? "").slice(0, 4000),
      horizon: (keys.includes(String(g.horizon)) ? g.horizon : "now") as HorizonKey,
      project_ids: Array.isArray(g.project_ids) ? g.project_ids.map(String).slice(0, 20) : [],
      milestones: (Array.isArray(g.milestones) ? g.milestones : []).slice(0, 50).map((m: Record<string, unknown>) => ({
        id: String(m.id),
        title: String(m.title ?? "").slice(0, 200),
        date: typeof m.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(m.date) ? m.date : null,
        done: !!m.done,
      })),
      reached: !!g.reached,
    })),
  };
}
