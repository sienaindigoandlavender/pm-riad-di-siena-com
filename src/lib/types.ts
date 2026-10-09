export type Project = {
  id: string;
  name: string;
  color: string;
  position: number;
  archived: boolean;
};

export type Task = {
  id: string;
  project_id: string | null;
  parent_id: string | null;
  title: string;
  notes: string;
  done: boolean;
  done_at: string | null;
  priority: 0 | 1 | 2 | 3;
  due_date: string | null;
  planned_for: string | null;
  start_date: string | null;
  repeat: Repeat | null;
  position: number;
  created_at: string;
};

export const REPEATS = ["daily", "weekdays", "weekly", "monthly", "yearly"] as const;
export type Repeat = (typeof REPEATS)[number];
export const REPEAT_LABEL: Record<Repeat, string> = {
  daily: "Every day",
  weekdays: "Every weekday",
  weekly: "Every week",
  monthly: "Every month",
  yearly: "Every year",
};

export type TaskPatch = Partial<
  Pick<
    Task,
    | "project_id"
    | "title"
    | "notes"
    | "done"
    | "priority"
    | "due_date"
    | "planned_for"
    | "start_date"
    | "repeat"
    | "position"
  >
>;

export const PRIORITY_LABEL = ["None", "Low", "Medium", "High"] as const;
