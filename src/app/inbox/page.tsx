import { Workspace } from "@/components/Workspace";
import { loadWorkspace } from "@/lib/load";

export default async function InboxPage() {
  const w = await loadWorkspace();
  return (
    <Workspace
      view={{ kind: "inbox" }}
      initial={w}
      setupNeeded={!w.configured}
      loadError={w.error}
      needsUpdate={w.needsUpdate}
    />
  );
}
