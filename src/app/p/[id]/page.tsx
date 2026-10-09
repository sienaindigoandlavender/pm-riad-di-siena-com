import { Workspace } from "@/components/Workspace";
import { loadWorkspace } from "@/lib/load";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await loadWorkspace();
  return (
    <Workspace
      view={{ kind: "project", id }}
      initial={w}
      setupNeeded={!w.configured}
      loadError={w.error}
    />
  );
}
