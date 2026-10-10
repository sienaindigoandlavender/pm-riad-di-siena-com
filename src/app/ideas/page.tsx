import { Workspace } from "@/components/Workspace";
import { loadWorkspace } from "@/lib/load";

export default async function IdeasPage() {
  const w = await loadWorkspace();
  return (
    <Workspace
      view={{ kind: "ideas" }}
      initial={w}
      setupNeeded={!w.configured}
      loadError={w.error}
      needsUpdate={w.needsUpdate}
    />
  );
}
