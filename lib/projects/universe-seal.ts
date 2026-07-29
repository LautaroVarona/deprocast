import "server-only";

import { shouldFilterByUniverse } from "@/lib/babel/context-seal";
import { registerBabelRecord } from "@/lib/babel/record-store";

/** Sella un proyecto Atanor en el universo activo para que aparezca en listados filtrados. */
export async function sealProjectInUniverse(
  projectId: string,
  universeSlug: string | undefined,
  title?: string,
  campoSlug?: string | null,
): Promise<void> {
  if (!universeSlug || !shouldFilterByUniverse(universeSlug)) return;

  await registerBabelRecord({
    kind: "capture",
    physicalRef: projectId,
    contextSeal: universeSlug,
    contentPreview: title?.trim() || `Proyecto · ${projectId}`,
    channel: "proyectos",
    campoSlug: campoSlug ?? null,
    metadata: { sealedVia: "proyectos-atanor" },
  });
}
