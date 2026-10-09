"use client";

import { useState } from "react";
import { PROJECT_COLORS } from "@/lib/colors";
import type { WorkspaceApi } from "./useWorkspace";

/** Calendars she subscribes to: Google, iCloud, Airbnb, Booking… any iCal link. */
export function FeedManager({ ws, errors }: { ws: WorkspaceApi; errors: Record<string, string> }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState<string>(PROJECT_COLORS[4]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  return (
    <section className="mt-10 rounded-[26px] bg-ground p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-[22px] font-semibold">Your calendars</h2>
        {adding ? null : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full bg-white px-3.5 py-1.5 text-[14px] font-semibold text-accent"
          >
            + Add a calendar
          </button>
        )}
      </div>

      {ws.feeds.length ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {ws.feeds.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-full bg-white py-2 ps-3 pe-2">
              <span className="size-3.5 shrink-0 rounded-full" style={{ background: f.color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{f.name}</span>
                {errors[f.id] ? (
                  <span className="block truncate text-[13px] text-danger">{errors[f.id]}</span>
                ) : null}
              </span>
              {confirm === f.id ? (
                <span className="flex items-center gap-1 text-[14px] font-semibold">
                  <button
                    type="button"
                    onClick={() => ws.removeFeed(f.id)}
                    className="rounded-full bg-danger px-3 py-1 text-white"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    className="px-2 py-1 text-ink-2"
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirm(f.id)}
                  className="flex size-8 items-center justify-center rounded-full text-[18px] text-ink-2 hover:bg-[#fde4ea] hover:text-danger"
                  aria-label={`Remove ${f.name}`}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : adding ? null : (
        <p className="mt-2 text-[15px] text-ink-2">
          Bring in Google, iCloud, Airbnb or Booking calendars with their iCal link. They show here
          alongside your tasks and appointments.
        </p>
      )}

      {adding ? (
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!url.trim()) return;
            setBusy(true);
            setProblem(null);
            const err = await ws.addFeed(name.trim() || "Calendar", url.trim(), color);
            setBusy(false);
            if (err) setProblem(err);
            else {
              setName("");
              setUrl("");
              setAdding(false);
            }
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name, like Airbnb bookings"
            className="rounded-full bg-white px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://… or webcal://… (the .ics link)"
            inputMode="url"
            className="rounded-full bg-white px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={c}
                onClick={() => setColor(c)}
                className="size-7 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c,
                  boxShadow: color === c ? `0 0 0 2px #fdf1e4, 0 0 0 4px ${c}` : undefined,
                }}
              />
            ))}
          </div>
          {problem ? <p className="text-[14px] font-semibold text-danger">{problem}</p> : null}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-ink px-4 py-2 text-[15px] font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Adding…" : "Subscribe"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setProblem(null);
              }}
              className="rounded-full px-3 py-2 text-[15px] font-semibold text-ink-2"
            >
              Cancel
            </button>
          </div>
          <details className="text-[14px] text-ink-2">
            <summary className="cursor-pointer font-semibold">Where do I find the link?</summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 ps-5">
              <li>
                Google Calendar: Settings → your calendar → &ldquo;Secret address in iCal
                format&rdquo;.
              </li>
              <li>iCloud: share the calendar as a public calendar and copy the webcal link.</li>
              <li>Airbnb: Calendar → Availability → Connect calendars → Export calendar.</li>
              <li>Booking.com: Rates &amp; availability → Sync calendars → Export.</li>
            </ul>
          </details>
        </form>
      ) : null}
    </section>
  );
}
