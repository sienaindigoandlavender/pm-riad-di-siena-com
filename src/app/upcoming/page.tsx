import { Workspace } from "@/components/Workspace";
import { loadWorkspace } from "@/lib/load";

export default async function UpcomingPage() {
  const w = await loadWorkspace();
  return (
    <Workspace
      view={{ kind: "upcoming" }}
      initial={w}
      setupNeeded={!w.configured}
      loadError={w.error}
    />
  );
}
