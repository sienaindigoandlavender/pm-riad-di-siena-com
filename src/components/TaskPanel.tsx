"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, today } from "@/lib/dates";
import { PRIORITY_LABEL, type Task } from "@/lib/types";
import { Check } from "./TaskRow";
import type { WorkspaceApi } from "./useWorkspace";

const label = "block text-[13px] font-semibold text-ink-2";
const field =
  "w-full border-b-2 border-line bg-transparent px-1 py-2.5 text-[15px] outline-none focus:border-ink";

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
    <aside className="pm-panel fixed inset-0 z-30 flex flex-col overflow-y-auto bg-white md:border-s-2 md:border-ink md:inset-y-0 md:start-auto md:end-0 md:w-[440px] ">
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
        <button
          type="button"
          onClick={() => ws.patchTask(task.id, { planned_for: plannedToday ? null : now })}
          className={`px-3 py-1 text-[13px] font-medium ${
            plannedToday ? "bg-accent text-white" : "bg-accent-soft text-accent"
          }`}
        >
          {plannedToday ? "On today" : "Add to today"}
        </button>
        <button type="button" onClick={onClose} className="text-[16px] font-semibold text-accent">
          Done
        </button>
      </div>

      <div className="flex flex-col gap-6 px-5 py-5">
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
            className="w-full resize-none bg-transparent text-[26px] font-bold leading-tight tracking-[-0.02em] outline-none [field-sizing:content]"
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
            <div className="mt-1.5 flex gap-3 text-[13px]">
              <button
                type="button"
                className="text-accent"
                onClick={() => ws.patchTask(task.id, { due_date: now })}
              >
                Today
              </button>
              <button
                type="button"
                className="text-accent"
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

        <div>
          <span className={label}>Priority</span>
          <div className="mt-1.5 grid grid-cols-4 border-2 border-ink">
            {PRIORITY_LABEL.map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => ws.patchTask(task.id, { priority: i as Task["priority"] })}
                className={`py-1.5 text-[13px] font-medium ${
                  task.priority === i ? "bg-ink text-white" : "text-ink-2"
                }`}
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
            className="mt-1.5 min-h-[120px] w-full resize-y bg-ground px-3 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-ink-3 focus:bg-[#efede8]"
          />
        </div>

        <div>
          <span className={label}>Subtasks</span>
          <ul className="mt-1.5 border-t border-line-soft">
            {subtasks.map((s) => (
              <li key={s.id} className="flex items-center gap-3 border-b border-line-soft py-2">
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
              className="w-full border-b border-line-soft bg-transparent py-2 outline-none placeholder:text-ink-3 focus:border-accent"
            />
          </form>
        </div>

        <div className="border-t border-line-soft pt-4">
          {confirmDelete ? (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  ws.deleteTask(task.id);
                  onClose();
                }}
                className="text-[15px] font-medium text-danger"
              >
                Delete task
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-[15px] text-ink-2"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-[15px] text-danger"
            >
              Delete…
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
