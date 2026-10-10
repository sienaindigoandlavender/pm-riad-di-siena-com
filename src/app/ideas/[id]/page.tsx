import { Workspace } from "@/components/Workspace";
import { db } from "@/lib/db";
import { loadWorkspace } from "@/lib/load";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [w, row] = await Promise.all([
    loadWorkspace(),
    db()?.from("pm_boards").select("name").eq("id", id).maybeSingle() ?? Promise.resolve({ data: null }),
  ]);
  const name = (row?.data as { name?: string } | null)?.name ?? "Ideas";
  return (
    <Workspace
      view={{ kind: "board", id, name }}
      initial={w}
      setupNeeded={!w.configured}
      loadError={w.error}
      needsUpdate={w.needsUpdate}
    />
  );
}
