"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, today } from "@/lib/dates";
import { PRIORITY_LABEL, REPEATS, REPEAT_LABEL, type Repeat, type Task } from "@/lib/types";
import { FLAG_COLORS } from "@/lib/colors";
import { Check } from "./TaskRow";
import type { WorkspaceApi } from "./useWorkspace";

const label = "block font-display text-[15px] font-semibold text-ink-2";
const field =
  "w-full rounded-2xl border-2 border-transparent bg-ground px-3 py-2.5 text-[15px] outline-none focus:border-accent";

/** Everything about one task. Changes save as you go. */
export function TaskPanel({
  task,
  ws,
  color,
  onClose,
}: {
  task: Task;
  ws: WorkspaceApi;
  color: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [newSub, setNewSub] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const now = today();
  const subtasks = ws.tasks
    .filter((t) => t.parent_id === task.id)
    .sort((a, b) => a.position - b.position);

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes);
    setConfirmDelete(false);
    // reset only when another task is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const saveTitle = () => {
    const t = title.trim();
    if (t && t !== task.title) ws.patchTask(task.id, { title: t });
    else setTitle(task.title);
  };
  const changeNotes = (v: string) => {
    setNotes(v);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => ws.patchTask(task.id, { notes: v }), 500);
  };

  const plannedToday = task.planned_for === now;

  return (
    <aside className="pm-panel fixed inset-0 z-30 flex flex-col overflow-y-auto bg-white md:inset-y-3 md:start-auto md:end-3 md:w-[440px] md:rounded-[32px] md:shadow-[0_10px_40px_rgba(43,34,56,0.14)]">
      <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
        <button
          type="button"
          onClick={() => ws.patchTask(task.id, { planned_for: plannedToday ? null : now })}
          className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition-transform hover:scale-105 ${
            plannedToday ? "bg-accent text-white" : "bg-accent-soft text-accent"
          }`}
        >
          {plannedToday ? "☀ On today" : "Add to today"}
        </button>
        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <span className="pm-in flex items-center gap-1 rounded-full bg-[#fde4ea] p-1 ps-3 text-[14px] font-semibold text-danger">
              Delete?
              <button
                type="button"
                onClick={() => {
                  ws.deleteTask(task.id);
                  onClose();
                }}
                className="rounded-full bg-danger px-3 py-1 text-white"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-full px-2.5 py-1 text-ink-2"
              >
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex size-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-[#fde4ea] hover:text-danger"
              aria-label="Delete task"
              title="Delete task"
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-ink px-4 py-1.5 text-[15px] font-semibold text-white"
          >
            Done
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-6 pb-10 pt-5">
        <div className="flex items-start gap-3">
          <div className="pt-1.5">
            <Check
              done={task.done}
              onToggle={() => ws.patchTask(task.id, { done: !task.done })}
              color={color}
              size={26}
            />
          </div>
          <textarea
            value={title}
            rows={1}
            onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
            onBlur={saveTitle}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), (e.target as HTMLTextAreaElement).blur())
            }
            className="w-full resize-none bg-transparent font-display text-[28px] font-semibold leading-tight outline-none [field-sizing:content]"
            aria-label="Title"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className={label}>Project</span>
            <select
              value={task.project_id ?? ""}
              onChange={(e) => ws.patchTask(task.id, { project_id: e.target.value || null })}
              className={`${field} mt-1.5`}
            >
              <option value="">Inbox</option>
              {ws.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>Due</span>
            <input
              type="date"
              value={task.due_date ?? ""}
              onChange={(e) => ws.patchTask(task.id, { due_date: e.target.value || null })}
              className={`${field} mt-1.5`}
            />
            <div className="mt-2 flex flex-wrap gap-1.5 text-[13px]">
              <button
                type="button"
                className="rounded-full bg-accent-soft px-2.5 py-0.5 font-semibold text-accent"
                onClick={() => ws.patchTask(task.id, { due_date: now })}
              >
                Today
              </button>
              <button
                type="button"
                className="rounded-full bg-accent-soft px-2.5 py-0.5 font-semibold text-accent"
                onClick={() => ws.patchTask(task.id, { due_date: addDays(now, 1) })}
              >
                Tomorrow
              </button>
              {task.due_date ? (
                <button
                  type="button"
                  className="text-ink-3"
                  onClick={() => ws.patchTask(task.id, { due_date: null })}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className={label}>Starts</span>
            <input
              type="date"
              value={task.start_date ?? ""}
              onChange={(e) => ws.patchTask(task.id, { start_date: e.target.value || null })}
              className={`${field} mt-1.5`}
            />
          </div>
          <div>
            <span className={label}>Repeats</span>
            <select
              value={task.repeat ?? ""}
              onChange={(e) =>
                ws.patchTask(task.id, { repeat: (e.target.value || null) as Repeat | null })
              }
              className={`${field} mt-1.5`}
            >
              <option value="">Never</option>
              {REPEATS.map((r) => (
                <option key={r} value={r}>
                  {REPEAT_LABEL[r]}
                </option>
              ))}
            </select>
            {task.repeat ? (
              <p className="mt-1.5 text-[13px] text-ink-2">
                When you tick it off, the next one appears.
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <span className={label}>Priority</span>
          <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-full bg-ground p-1">
            {PRIORITY_LABEL.map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => ws.patchTask(task.id, { priority: i as Task["priority"] })}
                className={`rounded-full py-1.5 text-[13px] font-semibold transition-colors ${
                  task.priority === i ? "text-white" : "text-ink-2 hover:bg-white"
                }`}
                style={
                  task.priority === i ? { background: i ? FLAG_COLORS[i] : "#2B2238" } : undefined
                }
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={label}>Notes</span>
          <textarea
            value={notes}
            onChange={(e) => changeNotes(e.target.value)}
            placeholder="Details, links, anything to remember"
            className="mt-1.5 min-h-[120px] w-full resize-y rounded-3xl border-2 border-transparent bg-ground px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-ink-3 focus:border-accent"
          />
        </div>

        <div>
          <span className={label}>Subtasks</span>
          <ul className="mt-1.5">
            {subtasks.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-1.5">
                <Check
                  done={s.done}
                  onToggle={() => ws.patchTask(s.id, { done: !s.done })}
                  color={color}
                  size={20}
                />
                <span className={`flex-1 ${s.done ? "text-ink-3 line-through" : ""}`}>
                  {s.title}
                </span>
                <button
                  type="button"
                  onClick={() => ws.deleteTask(s.id)}
                  className="px-1 text-[18px] leading-none text-ink-3 hover:text-danger"
                  aria-label="Delete subtask"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = newSub.trim();
              if (!t) return;
              ws.createTask({ title: t, parent_id: task.id, project_id: task.project_id });
              setNewSub("");
            }}
          >
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              placeholder="Add a subtask"
              className="mt-1 w-full rounded-full border-2 border-dashed border-line bg-transparent px-4 py-2 outline-none placeholder:text-ink-3 focus:border-accent"
            />
          </form>
        </div>
      </div>
    </aside>
  );
}
