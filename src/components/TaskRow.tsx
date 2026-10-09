"use client";

import { useState } from "react";
import { shortDate, today } from "@/lib/dates";
import { FLAG_COLORS } from "@/lib/colors";
import { REPEAT_LABEL, type Project, type Task } from "@/lib/types";

/** A round check in the project's colour. Finishing a task makes it pop and sparkle. */
export function Check({
  done,
  onToggle,
  color = "#8E7CE0",
  size = 22,
}: {
  done: boolean;
  onToggle: () => void;
  color?: string;
  size?: number;
}) {
  const [pop, setPop] = useState(false);
  const [burst, setBurst] = useState(0);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? "Mark as not done" : "Mark as done"}
        onClick={(e) => {
          e.stopPropagation();
          setPop(true);
          if (!done) setBurst((b) => b + 1);
          onToggle();
        }}
        onAnimationEnd={() => setPop(false)}
        className={`flex shrink-0 items-center justify-center rounded-full transition-colors ${pop ? "pm-pop" : ""}`}
        style={{
          width: size,
          height: size,
          border: `2.5px solid ${color}`,
          background: done ? color : "#fff",
        }}
      >
        {done ? (
          <svg viewBox="0 0 12 12" width={size * 0.55} height={size * 0.55} aria-hidden>
            <path
              d="M2.5 6.2 5 8.5 9.5 3.5"
              fill="none"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </button>
      {burst ? (
        <span key={burst} className="pointer-events-none absolute inset-0" aria-hidden>
          {SPARKS.map(([dx, dy, c], i) => (
            <span
              key={i}
              className="pm-spark absolute start-1/2 top-1/2 -ms-1 -mt-1 size-2 rounded-full"
              style={{ background: c, "--dx": `${dx}px`, "--dy": `${dy}px` } as React.CSSProperties}
            />
          ))}
        </span>
      ) : null}
    </span>
  );
}

const SPARKS: [number, number, string][] = [
  [0, -22, "#E0AE1F"],
  [19, -11, "#E26D8E"],
  [19, 11, "#5AA9E6"],
  [0, 22, "#7DBB5A"],
  [-19, 11, "#9B7FD9"],
  [-19, -11, "#F2994A"],
];

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
    (showProject && project) ||
    task.due_date ||
    task.repeat ||
    (subtasks && subtasks.total > 0) ||
    task.notes;

  return (
    <li
      onClick={onOpen}
      className={`pm-in group relative mx-1.5 flex cursor-default items-start gap-3.5 rounded-[20px] ps-3 pe-3 transition-colors ${
        selected ? "bg-accent-soft" : "hover:bg-ground"
      }`}
    >
      <div className="py-3">
        <Check done={task.done} onToggle={onToggle} color={color} />
      </div>
      <div className="min-w-0 flex-1 py-3 pe-1">
        <div className="flex items-center gap-2">
          <Flag level={task.done ? 0 : task.priority} />
          <p
            className={`truncate text-[16px] font-medium ${task.done ? "text-ink-3 line-through decoration-2" : "text-ink"}`}
            style={task.done ? { textDecorationColor: color } : undefined}
          >
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
              <span className="flex items-center gap-1.5 font-medium">
                <span className="size-2.5 rounded-full" style={{ background: color }} />
                {project.name}
              </span>
            ) : null}
            {task.due_date ? (
              <span
                className={
                  overdue ? "rounded-full bg-[#fde4ea] px-2 font-semibold text-danger" : undefined
                }
              >
                {shortDate(task.due_date, now)}
              </span>
            ) : null}
            {task.repeat ? (
              <span className="flex items-center gap-1 font-medium" title="Repeats">
                <span aria-hidden>↻</span>
                {REPEAT_LABEL[task.repeat]}
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
