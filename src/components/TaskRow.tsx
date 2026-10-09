"use client";

import { shortDate, today } from "@/lib/dates";
import type { Project, Task } from "@/lib/types";

export function Check({
  done,
  onToggle,
  size = 20,
}: {
  done: boolean;
  onToggle: () => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? "Mark as not done" : "Mark as done"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`flex shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
        done ? "border-ink bg-ink" : "border-ink-3 hover:border-ink"
      }`}
      style={{ width: size, height: size }}
    >
      {done ? (
        <svg viewBox="0 0 12 12" width={size * 0.55} height={size * 0.55} aria-hidden>
          <path
            d="M2.5 6.2 5 8.5 9.5 3.5"
            fill="none"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </button>
  );
}

const FLAG = ["", "!", "!!", "!!!"];

/** One task on a list: check, title, and a quiet line of facts. */
export function TaskRow({
  task,
  project,
  subtasks,
  selected,
  showProject = true,
  onToggle,
  onOpen,
  action,
}: {
  task: Task;
  project?: Project;
  subtasks?: { done: number; total: number };
  selected?: boolean;
  showProject?: boolean;
  onToggle: () => void;
  onOpen: () => void;
  action?: React.ReactNode;
}) {
  const now = today();
  const overdue = !task.done && task.due_date !== null && task.due_date < now;
  const meta: React.ReactNode[] = [];
  if (showProject && project) meta.push(<span key="p">{project.name}</span>);
  if (task.due_date)
    meta.push(
      <span key="d" className={overdue ? "text-danger" : undefined}>
        {shortDate(task.due_date, now)}
      </span>,
    );
  if (subtasks && subtasks.total > 0)
    meta.push(
      <span key="s">
        {subtasks.done}/{subtasks.total}
      </span>,
    );

  return (
    <li
      onClick={onOpen}
      className={`group flex cursor-default items-start gap-3 border-b border-line-soft px-3 py-2.5 transition-colors ${
        selected ? "bg-accent-soft" : "hover:bg-panel"
      }`}
    >
      <div className="pt-[1px]">
        <Check done={task.done} onToggle={onToggle} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate ${task.done ? "text-ink-3 line-through" : "text-ink"}`}>
          {task.priority > 0 ? (
            <span className="me-1.5 font-bold text-danger">{FLAG[task.priority]}</span>
          ) : null}
          {task.title}
        </p>
        {meta.length ? (
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-ink-3">
            {meta.map((m, i) => (
              <span key={i} className="flex gap-x-2">
                {i > 0 ? <span aria-hidden>·</span> : null}
                {m}
              </span>
            ))}
          </p>
        ) : null}
      </div>
      {action ? <div onClick={(e) => e.stopPropagation()}>{action}</div> : null}
    </li>
  );
}
