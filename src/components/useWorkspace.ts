"use client";

import { useCallback, useState } from "react";
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

/**
 * The workspace state on the client. Every change shows at once (optimistic)
 * and is written to the server in the background; a failure is reported.
 */
export function useWorkspace(initial: { projects: Project[]; tasks: Task[] }) {
  const [projects, setProjects] = useState(initial.projects);
  const [tasks, setTasks] = useState(initial.tasks);
  const [error, setError] = useState<string | null>(null);

  const fail = useCallback(
    (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    [],
  );

  const patchTask = useCallback(
    (id: string, patch: TaskPatch) => {
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
    [fail],
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
        color: "#111111",
        position: Date.now(),
        archived: false,
      };
      setProjects((list) => [...list, project]);
      send("/api/projects", "POST", project).catch(fail);
      return project;
    },
    [fail],
  );

  const renameProject = useCallback(
    (id: string, name: string) => {
      setProjects((list) => list.map((p) => (p.id === id ? { ...p, name } : p)));
      send(`/api/projects/${id}`, "PATCH", { name }).catch(fail);
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
    archiveProject,
  };
}

export type WorkspaceApi = ReturnType<typeof useWorkspace>;
