import { Workspace } from "@/components/Workspace";
import { loadWorkspace } from "@/lib/load";

export default async function CalendarPage() {
  const w = await loadWorkspace();
  return (
    <Workspace
      view={{ kind: "calendar" }}
      initial={w}
      setupNeeded={!w.configured}
      loadError={w.error}
      needsUpdate={w.needsUpdate}
    />
  );
}
