"use client";

import { useState } from "react";
import { shortDate, today } from "@/lib/dates";
import { FLAG_COLORS } from "@/lib/colors";
import type { Project, Task } from "@/lib/types";

/** Reminders-style check: a ring in the project's colour that fills when done. */
export function Check({
  done,
  onToggle,
  color = "#4A6B85",
  size = 22,
}: {
  done: boolean;
  onToggle: () => void;
  color?: string;
  size?: number;
}) {
  const [pop, setPop] = useState(false);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? "Mark as not done" : "Mark as done"}
      onClick={(e) => {
        e.stopPropagation();
        setPop(true);
        onToggle();
      }}
      onAnimationEnd={() => setPop(false)}
      className={`flex shrink-0 items-center justify-center rounded-full transition-colors ${pop ? "pm-pop" : ""}`}
      style={{
        width: size,
        height: size,
        border: `1.75px solid ${done ? color : "#C9C5BD"}`,
        background: done ? color : "transparent",
      }}
    >
      {done ? (
        <svg viewBox="0 0 12 12" width={size * 0.55} height={size * 0.55} aria-hidden>
          <path
            d="M2.5 6.2 5 8.5 9.5 3.5"
            fill="none"
            stroke="#fff"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}

export function Flag({ level }: { level: number }) {
  if (!level) return null;
  const color = FLAG_COLORS[level] ?? FLAG_COLORS[1];
  return (
    <svg
      viewBox="0 0 16 16"
      width="15"
      height="15"
      aria-label={`Priority ${level}`}
      className="shrink-0"
    >
      <path d="M3.5 14.5V2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 2.5h8.2l-2 3 2 3H4z" fill={color} />
    </svg>
  );
}

/** One task on a list. */
export function TaskRow({
  task,
  project,
  color,
  subtasks,
  selected,
  showProject = true,
  onToggle,
  onOpen,
  action,
}: {
  task: Task;
  project?: Project;
  color: string;
  subtasks?: { done: number; total: number };
  selected?: boolean;
  showProject?: boolean;
  onToggle: () => void;
  onOpen: () => void;
  action?: React.ReactNode;
}) {
  const now = today();
  const overdue = !task.done && task.due_date !== null && task.due_date < now;
  const hasMeta =
    (showProject && project) || task.due_date || (subtasks && subtasks.total > 0) || task.notes;

  return (
    <li
      onClick={onOpen}
      className={`group relative flex cursor-default items-start gap-3.5 ps-4 pe-3 transition-colors ${
        selected ? "bg-accent-soft" : "hover:bg-ground/70"
      }`}
    >
      <div className="py-3">
        <Check done={task.done} onToggle={onToggle} color={color} />
      </div>
      <div className="min-w-0 flex-1 border-b border-line-soft py-3 pe-1 group-last:border-b-0">
        <div className="flex items-center gap-2">
          <Flag level={task.done ? 0 : task.priority} />
          <p className={`truncate text-[16px] ${task.done ? "text-ink-3" : "text-ink"}`}>
            {task.title}
          </p>
          {action ? (
            <div className="ms-auto" onClick={(e) => e.stopPropagation()}>
              {action}
            </div>
          ) : null}
        </div>
        {hasMeta ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-ink-3">
            {showProject && project ? (
              <span className="flex items-center gap-1.5">
                <span className="size-2" style={{ background: color }} />
                {project.name}
              </span>
            ) : null}
            {task.due_date ? (
              <span className={overdue ? "font-medium text-danger" : undefined}>
                {shortDate(task.due_date, now)}
              </span>
            ) : null}
            {subtasks && subtasks.total > 0 ? (
              <span>
                {subtasks.done} of {subtasks.total}
              </span>
            ) : null}
            {task.notes ? (
              <svg viewBox="0 0 16 16" width="13" height="13" aria-label="Has notes">
                <path
                  d="M3 4h10M3 8h10M3 12h6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            ) : null}
          </p>
        ) : null}
      </div>
    </li>
  );
}
