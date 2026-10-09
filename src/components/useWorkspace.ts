"use client";

import { useCallback, useRef, useState } from "react";
import { PROJECT_COLORS } from "@/lib/colors";
import { nextCopy } from "@/lib/repeat";
import type { Project, Task, TaskPatch } from "@/lib/types";

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `Request failed (${res.status})`);
  }
  return res.json();
}

function blankTask(): Task {
  return {
    id: "",
    title: "",
    project_id: null,
    parent_id: null,
    notes: "",
    done: false,
    done_at: null,
    priority: 0,
    due_date: null,
    planned_for: null,
    start_date: null,
    repeat: null,
    position: Date.now(),
    created_at: new Date().toISOString(),
  };
}

/**
 * The workspace state on the client. Every change shows at once (optimistic)
 * and is written to the server in the background; a failure is reported.
 */
export function useWorkspace(initial: { projects: Project[]; tasks: Task[] }) {
  const [projects, setProjects] = useState(initial.projects);
  const [tasks, setTasks] = useState(initial.tasks);
  const [error, setError] = useState<string | null>(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const fail = useCallback(
    (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    [],
  );

  const spawnNext = useCallback(
    (t: Task) => {
      const fields = nextCopy(t);
      const id = crypto.randomUUID();
      const base = Date.now();
      const copy = { ...blankTask(), ...fields, id, title: t.title, position: base };
      const subs = tasksRef.current
        .filter((s) => s.parent_id === t.id)
        .map((s, i) => ({
          ...blankTask(),
          id: crypto.randomUUID(),
          title: s.title,
          parent_id: id,
          project_id: t.project_id,
          position: base + i + 1,
        }));
      setTasks((list) => [...list, copy, ...subs]);
      (async () => {
        await send("/api/tasks", "POST", copy);
        for (const s of subs) await send("/api/tasks", "POST", s);
      })().catch(fail);
    },
    [fail],
  );

  const patchTask = useCallback(
    (id: string, patch: TaskPatch) => {
      const before = tasksRef.current.find((t) => t.id === id);
      if (patch.done && before && !before.done && before.repeat) {
        // A repeating task: tick this one off and plant the next one.
        spawnNext(before);
        patch = { ...patch, repeat: null };
      }
      setTasks((list) =>
        list.map((t) =>
          t.id === id
            ? {
                ...t,
                ...patch,
                ...("done" in patch
                  ? { done_at: patch.done ? new Date().toISOString() : null }
                  : {}),
              }
            : t,
        ),
      );
      send(`/api/tasks/${id}`, "PATCH", patch).catch(fail);
    },
    [fail, spawnNext],
  );

  const createTask = useCallback(
    (fields: Partial<Task> & { title: string }) => {
      const task: Task = {
        id: crypto.randomUUID(),
        project_id: null,
        parent_id: null,
        notes: "",
        done: false,
        done_at: null,
        priority: 0,
        due_date: null,
        planned_for: null,
        start_date: null,
        repeat: null,
        position: Date.now(),
        created_at: new Date().toISOString(),
        ...fields,
      };
      setTasks((list) => [...list, task]);
      send("/api/tasks", "POST", task).catch(fail);
      return task;
    },
    [fail],
  );

  const deleteTask = useCallback(
    (id: string) => {
      setTasks((list) => list.filter((t) => t.id !== id && t.parent_id !== id));
      send(`/api/tasks/${id}`, "DELETE").catch(fail);
    },
    [fail],
  );

  const createProject = useCallback(
    (name: string) => {
      const project: Project = {
        id: crypto.randomUUID(),
        name,
        color: PROJECT_COLORS[projects.length % PROJECT_COLORS.length]!,
        position: Date.now(),
        archived: false,
      };
      setProjects((list) => [...list, project]);
      send("/api/projects", "POST", project).catch(fail);
      return project;
    },
    [fail, projects.length],
  );

  const renameProject = useCallback(
    (id: string, name: string) => {
      setProjects((list) => list.map((p) => (p.id === id ? { ...p, name } : p)));
      send(`/api/projects/${id}`, "PATCH", { name }).catch(fail);
    },
    [fail],
  );

  const setProjectColor = useCallback(
    (id: string, color: string) => {
      setProjects((list) => list.map((p) => (p.id === id ? { ...p, color } : p)));
      send(`/api/projects/${id}`, "PATCH", { color }).catch(fail);
    },
    [fail],
  );

  /** Save a new project order (ids top to bottom). Only moved ones are written. */
  const reorderProjects = useCallback(
    (ids: string[]) => {
      setProjects((list) => {
        const byId = new Map(list.map((p) => [p.id, p]));
        const next = ids
          .map((id, i) => {
            const p = byId.get(id);
            return p ? { ...p, position: (i + 1) * 1000 } : null;
          })
          .filter((p): p is Project => !!p);
        for (const p of next) {
          if (byId.get(p.id)?.position !== p.position)
            send(`/api/projects/${p.id}`, "PATCH", { position: p.position }).catch(fail);
        }
        return next;
      });
    },
    [fail],
  );

  const archiveProject = useCallback(
    (id: string) => {
      setProjects((list) => list.filter((p) => p.id !== id));
      send(`/api/projects/${id}`, "PATCH", { archived: true }).catch(fail);
    },
    [fail],
  );

  return {
    projects,
    tasks,
    error,
    clearError: () => setError(null),
    patchTask,
    createTask,
    deleteTask,
    createProject,
    renameProject,
    setProjectColor,
    archiveProject,
    reorderProjects,
  };
}

export type WorkspaceApi = ReturnType<typeof useWorkspace>;
