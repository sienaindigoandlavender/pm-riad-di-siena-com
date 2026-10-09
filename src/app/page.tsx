import { Workspace } from "@/components/Workspace";
import { loadWorkspace } from "@/lib/load";

export default async function TodayPage() {
  const w = await loadWorkspace();
  return (
    <Workspace
      view={{ kind: "today" }}
      initial={w}
      setupNeeded={!w.configured}
      loadError={w.error}
    />
  );
}
