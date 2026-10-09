import { Workspace } from "@/components/Workspace";
import { loadWorkspace } from "@/lib/load";

export default async function FlaggedPage() {
  const w = await loadWorkspace();
  return (
    <Workspace
      view={{ kind: "flagged" }}
      initial={w}
      setupNeeded={!w.configured}
      loadError={w.error}
      needsUpdate={w.needsUpdate}
    />
  );
}
