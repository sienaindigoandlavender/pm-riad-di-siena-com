"use client";

// Notes: her own little Obsidian. A list with search and tags on the left, the note on
// the right. Write in plain text; [[Note title]] links notes (a missing one is created
// on click), #tags group them, and each note shows the notes that link back to it.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { SMART, projectColor } from "@/lib/colors";
import { shortDate } from "@/lib/dates";
import { LINK_RE, renderNote, tagsOf, type Note } from "@/lib/notes";
import type { Project } from "@/lib/types";
import { tint } from "./HeroScene";

const C = SMART.notes;
const norm = (s: string) => s.trim().toLowerCase();

function snippet(body: string) {
  return body.replace(LINK_RE, "$1").replace(/[#*>`-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 110);
}

export function NotesView({ noteId, projects }: { noteId: string | null; projects: Project[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [setup, setSetup] = useState(false);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notes")
      .then((r) => r.json())
      .then((d) => {
        setNotes(d.notes || []);
        setSetup(d.error === "setup");
      })
      .catch(() => setNotes([]));
  }, []);

  const byTitle = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of notes || []) if (n.title) m.set(norm(n.title), n.id);
    return m;
  }, [notes]);

  async function create(title = "") {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const note: Note = { id, title, body: "", project_id: null, tags: [], created_at: now, updated_at: now };
    setNotes((ns) => [note, ...(ns || [])]);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    }).catch(() => {});
    router.push(`/notes/${id}`);
  }

  const update = (id: string, patch: Partial<Note>) =>
    setNotes((ns) => (ns || []).map((n) => (n.id === id ? { ...n, ...patch, updated_at: new Date().toISOString() } : n)));

  const remove = (id: string) => {
    setNotes((ns) => (ns || []).filter((n) => n.id !== id));
    fetch(`/api/notes/${id}`, { method: "DELETE" }).catch(() => {});
    router.push("/notes");
  };

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes || []) for (const t of n.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [notes]);

  const shown = (notes || [])
    .filter((n) => !tag || n.tags.includes(tag))
    .filter((n) => !q.trim() || `${n.title}\n${n.body}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const current = noteId ? (notes || []).find((n) => n.id === noteId) ?? null : null;

  return (
    <div>
      {setup ? (
        <div className="mb-5 rounded-3xl bg-ground px-5 py-3.5 text-[15px] text-ink-2">
          Notes need a small database update: run <code>supabase/pm-setup.sql</code> again in Supabase.
        </div>
      ) : null}
      <div className="grid gap-5 md:grid-cols-[300px_1fr]">
        <aside className={noteId ? "hidden md:block" : ""}>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search notes"
              className="min-w-0 flex-1 rounded-full bg-white px-4 py-2 text-[15px] outline-none placeholder:text-ink-3"
            />
            <button type="button" onClick={() => create()} className="rounded-full px-4 py-2 text-[15px] font-bold text-white" style={{ background: C }}>
              + Note
            </button>
          </div>
          {allTags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {allTags.map(([t]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(tag === t ? null : t)}
                  className="rounded-full px-2.5 py-1 text-[13px] font-semibold"
                  style={tag === t ? { background: C, color: "#fff" } : { background: tint(C, 0.82), color: "#2b2238" }}
                >
                  #{t}
                </button>
              ))}
            </div>
          ) : null}
          <ul className="mt-3 space-y-1.5">
            {notes === null ? (
              <li className="px-2 text-[15px] text-ink-2">Gathering your notes…</li>
            ) : shown.length === 0 ? (
              <li className="px-2 text-[15px] text-ink-2">{notes.length ? "Nothing matches." : "No notes yet. Start one."}</li>
            ) : (
              shown.map((n) => {
                const p = projects.find((x) => x.id === n.project_id);
                return (
                  <li key={n.id}>
                    <Link
                      href={`/notes/${n.id}`}
                      className={`block rounded-[20px] px-4 py-3 ${n.id === noteId ? "bg-white shadow-[0_1px_0_rgba(43,34,56,0.08)]" : "hover:bg-white/60"}`}
                    >
                      <span className="flex items-center gap-2">
                        {p ? <span className="size-2 shrink-0 rounded-full" style={{ background: projectColor(p) }} /> : null}
                        <span className="truncate font-display text-[16px] font-semibold text-ink">{n.title || "Untitled"}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-ink-2">
                        {shortDate(n.updated_at.slice(0, 10))} · {snippet(n.body) || "Empty"}
                      </span>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <section className={noteId ? "" : "hidden md:block"}>
          {current ? (
            <Editor
              key={current.id}
              note={current}
              notes={notes || []}
              projects={projects}
              resolve={(t) => byTitle.get(norm(t)) ?? null}
              onChange={(patch) => update(current.id, patch)}
              onCreateLinked={(title) => create(title)}
              onDelete={() => confirm("Delete this note?") && remove(current.id)}
            />
          ) : noteId && notes ? (
            <p className="px-2 text-[15px] text-ink-2">This note isn&apos;t here any more.</p>
          ) : (
            <div className="rounded-[28px] bg-white p-8 text-center">
              <p className="font-display text-[22px] font-semibold text-ink">A quiet page.</p>
              <p className="mt-1 text-[15px] text-ink-2">Pick a note, or start a new one. Link notes with [[double brackets]], group them with #tags.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Editor({
  note,
  notes,
  projects,
  resolve,
  onChange,
  onCreateLinked,
  onDelete,
}: {
  note: Note;
  notes: Note[];
  projects: Project[];
  resolve: (title: string) => string | null;
  onChange: (patch: Partial<Note>) => void;
  onCreateLinked: (title: string) => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [projectId, setProjectId] = useState(note.project_id ?? "");
  const [mode, setMode] = useState<"write" | "read">(note.body.trim() ? "read" : "write");
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved");
  const area = useRef<HTMLTextAreaElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(320, el.scrollHeight)}px`;
  }, [body, mode]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaved("saving");
    onChange({ title, body, project_id: projectId || null, tags: tagsOf(body) });
    const t = setTimeout(() => {
      fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, project_id: projectId || null }),
      })
        .then((r) => setSaved(r.ok ? "saved" : "error"))
        .catch(() => setSaved("error"));
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, projectId]);

  const html = useMemo(() => renderNote(body, resolve), [body, resolve]);
  const backlinks = note.title
    ? notes.filter((n) => n.id !== note.id && Array.from(n.body.matchAll(LINK_RE)).some((m) => norm(m[1] ?? "") === norm(note.title)))
    : [];

  return (
    <article className="rounded-[28px] bg-white p-5 md:p-7">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link href="/notes" className="rounded-full bg-ground px-3 py-1.5 text-[13px] font-semibold text-ink-2 md:hidden">
          ← Notes
        </Link>
        <span className="flex rounded-full bg-ground p-0.5">
          {(["read", "write"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 text-[13px] font-bold ${mode === m ? "bg-white text-ink shadow-[0_1px_0_rgba(43,34,56,0.08)]" : "text-ink-2"}`}
            >
              {m === "read" ? "Read" : "Write"}
            </button>
          ))}
        </span>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-full bg-ground px-3 py-1.5 text-[13px] font-semibold text-ink-2 outline-none"
        >
          <option value="">No project</option>
          {projects.filter((p) => !p.archived).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <span className="ms-auto text-[13px] font-semibold text-ink-3" aria-live="polite">
          {saved === "saving" ? "Saving…" : saved === "error" ? "Not saved, will retry" : "Saved"}
        </span>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        autoFocus={!note.title}
        className="w-full bg-transparent font-display text-[30px] font-semibold leading-tight text-ink outline-none placeholder:text-ink-3"
      />

      {mode === "write" ? (
        <textarea
          ref={area}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"Write freely.\n\n# A heading\n- a list\n- [ ] a checkbox\n**bold**, *italic*, [[Another note]], #tag"}
          className="mt-3 w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
        />
      ) : (
        <div
          className="note-render mt-3 min-h-[200px] text-[16px] leading-relaxed text-ink"
          onDoubleClick={() => setMode("write")}
          onClick={(e) => {
            const a = (e.target as HTMLElement).closest("a.note-link") as HTMLAnchorElement | null;
            if (!a) return;
            e.preventDefault();
            const id = resolve(a.dataset.title || "");
            if (id) router.push(`/notes/${id}`);
            else onCreateLinked(a.dataset.title || "");
          }}
          dangerouslySetInnerHTML={{ __html: html || '<p class="note-empty">Nothing yet. Double-click to write.</p>' }}
        />
      )}

      {backlinks.length ? (
        <div className="mt-8 border-t border-line-soft pt-4">
          <p className="mb-2 text-[13px] font-semibold text-ink-2">Linked from</p>
          <div className="flex flex-wrap gap-1.5">
            {backlinks.map((n) => (
              <Link key={n.id} href={`/notes/${n.id}`} className="rounded-full px-3 py-1 text-[14px] font-semibold text-ink" style={{ background: tint(C, 0.82) }}>
                {n.title || "Untitled"}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex justify-end">
        <button type="button" onClick={onDelete} className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-danger">
          Delete note
        </button>
      </div>
    </article>
  );
}
