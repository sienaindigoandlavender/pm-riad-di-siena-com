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
  position: number;
  created_at: string;
};

export type TaskPatch = Partial<
  Pick<
    Task,
    "project_id" | "title" | "notes" | "done" | "priority" | "due_date" | "planned_for" | "position"
  >
>;

export const PRIORITY_LABEL = ["None", "Low", "Medium", "High"] as const;
