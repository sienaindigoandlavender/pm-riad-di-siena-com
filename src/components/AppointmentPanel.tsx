"use client";

import { useEffect, useState } from "react";
import { longDate } from "@/lib/dates";
import { TEAM } from "@/lib/team";
import { REPEATS, REPEAT_LABEL, type Appointment, type Project, type Repeat } from "@/lib/types";

const label = "block font-display text-[15px] font-semibold text-ink-2";
const field =
  "w-full rounded-2xl border-2 border-transparent bg-ground px-3 py-2.5 text-[15px] outline-none focus:border-accent";

function plusHour(t: string) {
  const h = Math.min(23, Number(t.slice(0, 2)) + 1);
  return `${String(h).padStart(2, "0")}:${t.slice(3, 5)}`;
}

/** One appointment. A new one is kept aside until "Add"; an existing one saves as you go. */
export function AppointmentPanel({
  appt,
  isNew,
  projects,
  color,
  onChange,
  onDelete,
  onSave,
  onClose,
}: {
  appt: Appointment;
  isNew: boolean;
  projects: Project[];
  color: string;
  onChange: (patch: Partial<Appointment>) => void;
  onDelete: () => void;
  onSave: (patch: Partial<Appointment>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(appt.title);
  const [notes, setNotes] = useState(appt.notes);
  const [location, setLocation] = useState(appt.location);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    setTitle(appt.title);
    setNotes(appt.notes);
    setLocation(appt.location);
    setConfirm(false);
    // reset only when another appointment is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const allDay = !appt.start_time;
  const commitTitle = () => {
    const t = title.trim();
    if (t && t !== appt.title) onChange({ title: t });
    else if (!t) setTitle(appt.title);
  };

  return (
    <aside className="pm-panel fixed inset-0 z-30 flex flex-col overflow-y-auto bg-white md:inset-y-3 md:start-auto md:end-3 md:w-[440px] md:rounded-[32px] md:shadow-[0_10px_40px_rgba(43,34,56,0.14)]">
      <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
        <span
          className="rounded-full px-3.5 py-1.5 text-[14px] font-semibold text-white"
          style={{ background: color }}
        >
          {isNew ? "New appointment" : "Appointment"}
        </span>
        <div className="flex items-center gap-2">
          {isNew ? null : confirm ? (
            <span className="pm-in flex items-center gap-1 rounded-full bg-[#fde4ea] p-1 ps-3 text-[14px] font-semibold text-danger">
              Delete?
              <button
                type="button"
                onClick={onDelete}
                className="rounded-full bg-danger px-3 py-1 text-white"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="rounded-full px-2.5 py-1 text-ink-2"
              >
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="flex size-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-[#fde4ea] hover:text-danger"
              aria-label="Delete appointment"
              title="Delete appointment"
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
          {isNew ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-3 py-1.5 text-[15px] font-semibold text-ink-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onSave({ title: title.trim(), location, notes })}
                className="rounded-full bg-ink px-4 py-1.5 text-[15px] font-semibold text-white"
              >
                Add
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-ink px-4 py-1.5 text-[15px] font-semibold text-white"
            >
              Done
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 px-6 pb-10 pt-5">
        <textarea
          autoFocus={isNew}
          onFocus={(e) => isNew && e.currentTarget.select()}
          value={title}
          rows={1}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
          onBlur={commitTitle}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.preventDefault(), (e.target as HTMLTextAreaElement).blur())
          }
          placeholder="What is it?"
          className="w-full resize-none bg-transparent font-display text-[28px] font-semibold leading-tight outline-none placeholder:text-ink-3 [field-sizing:content]"
          aria-label="Title"
        />

        <div>
          <span className={label}>When</span>
          <input
            type="date"
            value={appt.date}
            onChange={(e) => e.target.value && onChange({ date: e.target.value })}
            className={`${field} mt-1.5`}
            aria-label="Date"
          />
          <p className="mt-1.5 text-[13px] text-ink-2">{longDate(appt.date)}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={allDay}
              onClick={() =>
                allDay
                  ? onChange({ start_time: "09:00", end_time: "10:00" })
                  : onChange({ start_time: null, end_time: null })
              }
              className={`relative h-7 w-12 rounded-full transition-colors ${allDay ? "bg-accent" : "bg-line"}`}
            >
              <span
                className={`absolute top-1 size-5 rounded-full bg-white transition-all ${allDay ? "start-6" : "start-1"}`}
              />
            </button>
            <span className="text-[15px] font-medium">All day</span>
          </div>
          {allDay ? null : (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <label>
                <span className="text-[13px] font-semibold text-ink-2">Starts</span>
                <input
                  type="time"
                  value={appt.start_time ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    const end = appt.end_time && appt.end_time > v ? appt.end_time : plusHour(v);
                    onChange({ start_time: v, end_time: end });
                  }}
                  className={`${field} mt-1`}
                />
              </label>
              <label>
                <span className="text-[13px] font-semibold text-ink-2">Ends</span>
                <input
                  type="time"
                  value={appt.end_time ?? ""}
                  onChange={(e) => onChange({ end_time: e.target.value || null })}
                  className={`${field} mt-1`}
                />
              </label>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className={label}>Repeats</span>
            <select
              value={appt.repeat ?? ""}
              onChange={(e) => onChange({ repeat: (e.target.value || null) as Repeat | null })}
              className={`${field} mt-1.5`}
            >
              <option value="">Never</option>
              {REPEATS.map((r) => (
                <option key={r} value={r}>
                  {REPEAT_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>Project</span>
            <select
              value={appt.project_id ?? ""}
              onChange={(e) => onChange({ project_id: e.target.value || null })}
              className={`${field} mt-1.5`}
            >
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span className={label}>Where</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={() => location !== appt.location && onChange({ location })}
            placeholder="A place, an address, a link"
            className={`${field} mt-1.5`}
          />
        </div>

        <div>
          <span className={label}>Who</span>
          <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Who">
            {TEAM.map((p) => {
              const on = (appt.assignee ?? "jackie") === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onChange({ assignee: p.id === "jackie" ? null : p.id })}
                  className={`flex items-center gap-2 rounded-full py-1 ps-1 pe-3.5 text-[14px] font-semibold transition-colors ${
                    on ? "text-white" : "bg-ground text-ink-2 hover:bg-line-soft"
                  }`}
                  style={on ? { background: p.color } : undefined}
                >
                  <span
                    className="flex size-7 items-center justify-center rounded-full font-display text-[15px] text-white"
                    style={{ background: on ? "rgba(255,255,255,0.28)" : p.color }}
                  >
                    {p.full[0]}
                  </span>
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className={label}>Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== appt.notes && onChange({ notes })}
            placeholder="Anything to bring or remember"
            className="mt-1.5 min-h-[110px] w-full resize-y rounded-3xl border-2 border-transparent bg-ground px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-ink-3 focus:border-accent"
          />
        </div>
      </div>
    </aside>
  );
}
