import { Workspace } from "@/components/Workspace";
import { loadWorkspace } from "@/lib/load";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await loadWorkspace();
  return <Workspace view={{ kind: "notes", id }} initial={w} setupNeeded={!w.configured} loadError={w.error} needsUpdate={w.needsUpdate} />;
}
