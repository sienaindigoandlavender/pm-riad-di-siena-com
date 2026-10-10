"use client";

// All idea boards: one card per board, newest first, and a way to start a new one.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SMART, projectColor } from "@/lib/colors";
import type { BoardSummary, Project } from "@/lib/types";
import { tint } from "./HeroScene";

function ago(iso: string) {
  const d = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 86400000));
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

export function IdeasView({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [setup, setSetup] = useState(false);
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const byId = new Map(projects.map((p) => [p.id, p]));

  useEffect(() => {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((d) => {
        setBoards(d.boards || []);
        setSetup(d.error === "setup");
      })
      .catch(() => setBoards([]));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const id = crypto.randomUUID();
    const r = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: name.trim() || "New board", project_id: projectId || null }),
    }).catch(() => null);
    setBusy(false);
    if (r?.ok) router.push(`/ideas/${id}`);
  }

  async function remove(b: BoardSummary) {
    if (!confirm(`Put “${b.name}” away? Its ideas go with it.`)) return;
    setBoards((list) => (list || []).filter((x) => x.id !== b.id));
    fetch(`/api/boards/${b.id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div>
      {setup ? (
        <div className="mb-5 rounded-3xl bg-ground px-5 py-3.5 text-[15px] text-ink-2">
          Boards need a small database update: run <code>supabase/pm-setup.sql</code> again in Supabase.
        </div>
      ) : null}

      <form onSubmit={create} className="mb-8 flex flex-wrap items-center gap-2 rounded-[26px] bg-white p-2.5 ps-4 shadow-[0_1px_0_rgba(43,34,56,0.06)]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="A new board… (e.g. Supper club, Slow Morocco 2027)"
          className="min-w-[180px] flex-1 bg-transparent py-2 text-[16px] outline-none placeholder:text-ink-3"
        />
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-full bg-ground px-3 py-2 text-[14px] font-semibold text-ink-2 outline-none"
        >
          <option value="">No project</option>
          {projects.filter((p) => !p.archived).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          disabled={busy}
          className="rounded-full px-5 py-2 text-[15px] font-bold text-white disabled:opacity-60"
          style={{ background: SMART.ideas }}
        >
          {busy ? "Planting…" : "Start board"}
        </button>
      </form>

      {boards === null ? (
        <p className="px-2 text-[15px] text-ink-2">Gathering your boards…</p>
      ) : boards.length === 0 && !setup ? (
        <p className="px-2 text-[15px] text-ink-2">No boards yet. Start one above and let the ideas wander.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {boards.map((b) => {
            const p = b.project_id ? byId.get(b.project_id) : undefined;
            const c = p ? projectColor(p) : SMART.ideas;
            return (
              <div key={b.id} className="group relative">
                <Link
                  href={`/ideas/${b.id}`}
                  className="flex h-full flex-col gap-6 rounded-[26px] p-5 transition-transform hover:-translate-y-0.5"
                  style={{ background: tint(c, 0.82) }}
                >
                  <span className="flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ background: c }} />
                    <span className="text-[13px] font-semibold text-ink-2">{p ? p.name : "Loose ideas"}</span>
                  </span>
                  <span className="font-display text-[24px] font-semibold leading-tight text-ink">{b.name}</span>
                  <span className="text-[13px] font-semibold text-ink-2">
                    {b.ideas} {b.ideas === 1 ? "idea" : "ideas"} · {ago(b.updated_at)}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => remove(b)}
                  aria-label={`Remove ${b.name}`}
                  className="absolute end-3 top-3 hidden size-8 items-center justify-center rounded-full bg-white/80 text-ink-2 group-hover:flex"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
