import "server-only";

import { shouldFilterByUniverse } from "@/lib/babel/context-seal";
import { registerBabelRecord } from "@/lib/babel/record-store";

export const PERSONA_UNIVERSE_KIND = "kg_node";

/** Sella un nodo CRM en el universo activo para que aparezca en listas filtradas. */
export async function sealKgNodeInUniverse(
  nodeId: string,
  universeSlug: string | undefined,
  preview?: string,
): Promise<void> {
  if (!universeSlug || !shouldFilterByUniverse(universeSlug)) return;

  await registerBabelRecord({
    kind: PERSONA_UNIVERSE_KIND,
    physicalRef: nodeId,
    contextSeal: universeSlug,
    contentPreview: preview?.trim() || `Nodo CRM · ${nodeId}`,
    channel: "personas",
    metadata: { sealedVia: "personas-crm" },
  });
}
