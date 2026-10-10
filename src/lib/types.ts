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
  assignee: string | null;
  position: number;
  created_at: string;
};

/** Something at a time (or all day) on a date. Times are Marrakech "HH:MM". */
export type Appointment = {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  notes: string;
  project_id: string | null;
  assignee: string | null;
  repeat: Repeat | null;
  created_at: string;
};

export type Feed = { id: string; name: string; url: string; color: string };

/** One occurrence from a subscribed calendar, already in Marrakech time. */
export type FeedEvent = {
  id: string;
  feed_id: string;
  title: string;
  date: string;
  end_date: string;
  start: string | null;
  end: string | null;
  location: string;
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
    | "assignee"
    | "position"
  >
>;

export const PRIORITY_LABEL = ["None", "Low", "Medium", "High"] as const;

/** An idea card on a board. Position is canvas coordinates. */
export type IdeaCard = {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  task_id?: string | null;
};
export type IdeaLink = { id: string; from: string; to: string; fromSide?: string | null; toSide?: string | null };
export type BoardData = { nodes: IdeaCard[]; edges: IdeaLink[] };
export type Board = {
  id: string;
  name: string;
  project_id: string | null;
  data: BoardData;
  updated_at: string;
};
export type BoardSummary = Omit<Board, "data"> & { ideas: number };
