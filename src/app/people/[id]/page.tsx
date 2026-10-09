import { notFound } from "next/navigation";
import { Workspace } from "@/components/Workspace";
import { loadWorkspace } from "@/lib/load";
import { PEOPLE_IDS } from "@/lib/team";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!PEOPLE_IDS.includes(id)) notFound();
  const w = await loadWorkspace();
  return (
    <Workspace
      view={{ kind: "person", id }}
      initial={w}
      setupNeeded={!w.configured}
      loadError={w.error}
      needsUpdate={w.needsUpdate}
    />
  );
}
