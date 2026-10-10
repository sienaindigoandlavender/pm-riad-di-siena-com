import { Workspace } from "@/components/Workspace";
import { loadWorkspace } from "@/lib/load";

export default async function NotesPage() {
  const w = await loadWorkspace();
  return <Workspace view={{ kind: "notes", id: null }} initial={w} setupNeeded={!w.configured} loadError={w.error} needsUpdate={w.needsUpdate} />;
}
