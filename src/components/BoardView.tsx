"use client";

// One idea board: round cards on an open canvas, arrows between them, pan and zoom.
// Double-click (or "+ Idea") to plant a card, drag from a card's dot to another card
// to link them, and turn any card into a task. Saves itself a moment after each change.
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { PROJECT_COLORS, SMART, projectColor } from "@/lib/colors";
import type { Board, BoardData, Project, Task } from "@/lib/types";
import { tint } from "./HeroScene";

type CardData = { text: string; color: string; task_id: string | null; editing?: boolean; taskDone?: boolean };
type CardNode = Node<CardData, "idea">;

const INK = "#2b2238";
const edgeStyle = {
  type: "default",
  style: { stroke: "#8a7f98", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#8a7f98", width: 18, height: 18 },
} as const;

function IdeaCardNode({ id, data, selected }: NodeProps<CardNode>) {
  const { updateNodeData } = useReactFlow();
  const [draft, setDraft] = useState(data.text);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setDraft(data.text), [data.text]);
  useEffect(() => {
    if (data.editing) ref.current?.focus();
  }, [data.editing]);
  const finish = () => updateNodeData(id, { text: draft.trim() || "New idea", editing: false });
  const dot = "!size-3 !border-2 !border-white !opacity-0 group-hover:!opacity-100 transition-opacity";
  return (
    <div
      className="group relative min-w-[150px] max-w-[260px] rounded-[24px] px-4 py-3"
      style={{
        background: tint(data.color, 0.8),
        border: `2px solid ${selected ? INK : data.color}`,
        boxShadow: selected ? "0 6px 18px rgba(43,34,56,0.14)" : "0 2px 0 rgba(43,34,56,0.06)",
      }}
      onDoubleClick={() => updateNodeData(id, { editing: true })}
    >
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Handle
          key={side}
          id={side}
          type="source"
          position={{ top: Position.Top, right: Position.Right, bottom: Position.Bottom, left: Position.Left }[side]}
          className={dot}
          style={{ background: data.color }}
        />
      ))}
      {data.editing ? (
        <textarea
          ref={ref}
          value={draft}
          rows={Math.min(6, Math.max(1, Math.ceil(draft.length / 22)))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={finish}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              finish();
            }
            if (e.key === "Escape") finish();
          }}
          className="nodrag nowheel w-full resize-none bg-transparent font-display text-[16px] font-medium leading-snug text-ink outline-none"
        />
      ) : (
        <p className={`whitespace-pre-wrap font-display text-[16px] font-medium leading-snug text-ink ${data.taskDone ? "line-through opacity-60" : ""}`}>
          {data.text}
        </p>
      )}
      {data.task_id ? (
        <span
          className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold text-white"
          style={{ background: data.color }}
        >
          ✓ {data.taskDone ? "Done" : "In tasks"}
        </span>
      ) : null}
    </div>
  );
}

const nodeTypes = { idea: IdeaCardNode };

const toNodes = (d: BoardData): CardNode[] =>
  d.nodes.map((n) => ({
    id: n.id,
    type: "idea",
    position: { x: n.x, y: n.y },
    data: { text: n.text, color: n.color, task_id: n.task_id ?? null },
  }));
const toEdges = (d: BoardData): Edge[] =>
  d.edges.map((e) => ({
    id: e.id,
    source: e.from,
    target: e.to,
    sourceHandle: e.fromSide ?? "right",
    targetHandle: e.toSide ?? "left",
    ...edgeStyle,
  }));
const toData = (nodes: CardNode[], edges: Edge[]): BoardData => ({
  nodes: nodes.map((n) => ({
    id: n.id,
    x: Math.round(n.position.x),
    y: Math.round(n.position.y),
    text: n.data.text,
    color: n.data.color,
    task_id: n.data.task_id,
  })),
  edges: edges.map((e) => ({
    id: e.id,
    from: e.source,
    to: e.target,
    fromSide: e.sourceHandle ?? null,
    toSide: e.targetHandle ?? null,
  })),
});

function Canvas({
  board,
  projects,
  tasks,
  createTask,
}: {
  board: Board;
  projects: Project[];
  tasks: Task[];
  createTask: (fields: Partial<Task> & { title: string }) => Task;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CardNode>(toNodes(board.data));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toEdges(board.data));
  const [name, setName] = useState(board.name);
  const [projectId, setProjectId] = useState(board.project_id ?? "");
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved");
  const { screenToFlowPosition, getViewport } = useReactFlow();
  const wrap = useRef<HTMLDivElement>(null);
  const project = projects.find((p) => p.id === projectId);
  const defaultColor = project ? projectColor(project) : SMART.ideas;

  // Keep "done" in step with the task list.
  const doneById = useMemo(() => new Map(tasks.map((t) => [t.id, t.done])), [tasks]);
  const shown = useMemo(
    () => nodes.map((n) => (n.data.task_id ? { ...n, data: { ...n.data, taskDone: !!doneById.get(n.data.task_id) } } : n)),
    [nodes, doneById],
  );

  // Save a moment after the canvas settles.
  const snapshot = JSON.stringify(toData(nodes, edges));
  const last = useRef(snapshot);
  useEffect(() => {
    if (snapshot === last.current) return;
    if (nodes.some((n) => n.dragging)) return;
    setSaved("saving");
    const t = setTimeout(() => {
      last.current = snapshot;
      fetch(`/api/boards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: JSON.parse(snapshot) }),
      })
        .then((r) => setSaved(r.ok ? "saved" : "error"))
        .catch(() => setSaved("error"));
    }, 700);
    return () => clearTimeout(t);
  }, [snapshot, nodes, board.id]);

  const patchBoard = (body: Record<string, unknown>) =>
    fetch(`/api/boards/${board.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => setSaved("error"));

  const plant = useCallback(
    (pos?: { x: number; y: number }) => {
      let at = pos;
      if (!at) {
        const r = wrap.current?.getBoundingClientRect();
        at = r
          ? screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
          : { x: -getViewport().x, y: -getViewport().y };
        at = { x: at.x - 75 + (Math.random() * 40 - 20), y: at.y - 25 + (Math.random() * 40 - 20) };
      }
      const id = crypto.randomUUID();
      setNodes((ns) => [
        ...ns.map((n) => ({ ...n, selected: false })),
        { id, type: "idea", position: at!, selected: true, data: { text: "", color: defaultColor, task_id: null, editing: true } },
      ]);
    },
    [defaultColor, getViewport, screenToFlowPosition, setNodes],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      setEdges((es) => addEdge({ ...c, id: crypto.randomUUID(), sourceHandle: c.sourceHandle, targetHandle: c.targetHandle, ...edgeStyle }, es));
    },
    [setEdges],
  );

  const selected = nodes.filter((n) => n.selected);
  const recolor = (color: string) =>
    setNodes((ns) => ns.map((n) => (n.selected ? { ...n, data: { ...n.data, color } } : n)));
  const remove = () => {
    const ids = new Set(selected.map((n) => n.id));
    setNodes((ns) => ns.filter((n) => !ids.has(n.id)));
    setEdges((es) => es.filter((e) => !e.selected && !ids.has(e.source) && !ids.has(e.target)));
  };
  const makeTasks = () => {
    const made = new Map<string, string>();
    for (const n of selected) {
      if (n.data.task_id || !n.data.text.trim()) continue;
      const t = createTask({
        title: n.data.text.trim().slice(0, 200),
        project_id: projectId || null,
        notes: `From the idea board “${name}”.`,
      });
      made.set(n.id, t.id);
    }
    if (made.size) setNodes((ns) => ns.map((n) => (made.has(n.id) ? { ...n, data: { ...n.data, task_id: made.get(n.id)! } } : n)));
  };

  const pill = "rounded-full px-3.5 py-1.5 text-[14px] font-bold shadow-[0_1px_0_rgba(43,34,56,0.08)]";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
        <Link href="/ideas" className="rounded-full bg-white px-3 py-1.5 text-[14px] font-semibold text-ink-2">
          ← All boards
        </Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => patchBoard({ name })}
          className="min-w-[160px] flex-1 rounded-full bg-transparent px-3 py-1.5 font-display text-[22px] font-semibold text-ink outline-none focus:bg-white"
          aria-label="Board name"
        />
        <select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            patchBoard({ project_id: e.target.value || null });
          }}
          className="rounded-full bg-white px-3 py-1.5 text-[14px] font-semibold text-ink-2 outline-none"
        >
          <option value="">No project</option>
          {projects.filter((p) => !p.archived).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <span className="text-[13px] font-semibold text-ink-3" aria-live="polite">
          {saved === "saving" ? "Saving…" : saved === "error" ? "Not saved, will retry on next change" : "Saved"}
        </span>
      </div>

      <div ref={wrap} className="h-[70vh] min-h-[460px] overflow-hidden rounded-[28px] border border-line-soft bg-white">
        <ReactFlow
          nodes={shown}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          connectionMode={ConnectionMode.Loose}
          defaultEdgeOptions={edgeStyle}
          connectionLineStyle={{ stroke: "#8a7f98", strokeWidth: 2 }}
          zoomOnDoubleClick={false}
          onPaneClick={(e) => {
            if (e.detail === 2) plant(screenToFlowPosition({ x: e.clientX - 75, y: e.clientY - 22 }));
          }}
          deleteKeyCode={["Backspace", "Delete"]}
          minZoom={0.2}
          maxZoom={2}
          fitView={nodes.length > 0}
          fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={2} color="#eadfce" bgColor="#fffaf3" />
          <Controls showInteractive={false} position="bottom-right" />
          <Panel position="top-left" className="!m-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => plant()} className={`${pill} text-white`} style={{ background: SMART.ideas }}>
              + Idea
            </button>
            {selected.length ? (
              <>
                <span className="flex items-center gap-1 rounded-full bg-white px-2 py-1.5 shadow-[0_1px_0_rgba(43,34,56,0.08)]">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => recolor(c)}
                      aria-label="Colour"
                      className="size-5 rounded-full"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                {selected.some((n) => !n.data.task_id) ? (
                  <button type="button" onClick={makeTasks} className={`${pill} bg-white text-ink`}>
                    Make {selected.length > 1 ? "them tasks" : "it a task"}
                  </button>
                ) : null}
                <button type="button" onClick={remove} className={`${pill} bg-white text-danger`}>
                  Remove
                </button>
              </>
            ) : null}
          </Panel>
          {nodes.length === 0 ? (
            <Panel position="top-center" className="!mt-24 pointer-events-none text-center">
              <p className="font-display text-[22px] font-semibold text-ink-2">An empty garden.</p>
              <p className="mt-1 text-[15px] text-ink-3">Double-click anywhere, or tap “+ Idea”, to plant the first one.</p>
            </Panel>
          ) : null}
        </ReactFlow>
      </div>
      <p className="mt-2 px-2 text-[13px] text-ink-3">
        Double-click a card to edit · drag from a card&apos;s dot to another card to link them · select and press Delete to remove
      </p>
    </div>
  );
}

export function BoardView({
  boardId,
  projects,
  tasks,
  createTask,
}: {
  boardId: string;
  projects: Project[];
  tasks: Task[];
  createTask: (fields: Partial<Task> & { title: string }) => Task;
}) {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/boards/${boardId}`)
      .then((r) => r.json())
      .then((d) => (d.board ? setBoard(d.board) : setError(d.error || "Board not found")))
      .catch(() => setError("Couldn't load the board"));
  }, [boardId]);
  if (error)
    return (
      <p className="px-2 text-[15px] text-ink-2">
        {error}. <Link href="/ideas" className="font-semibold text-accent">Back to all boards</Link>
      </p>
    );
  if (!board) return <p className="px-2 text-[15px] text-ink-2">Opening the board…</p>;
  return (
    <ReactFlowProvider>
      <Canvas board={board} projects={projects} tasks={tasks} createTask={createTask} />
    </ReactFlowProvider>
  );
}
