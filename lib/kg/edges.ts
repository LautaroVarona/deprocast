import { resolveNameToId, type NameToIdMap } from "@/lib/kg/identity";
import { prisma } from "@/lib/prisma";
import type { LlmRelation } from "@/lib/kg/types";

export async function createEdgesFromExtraction(
  relations: LlmRelation[],
  nameToIdMap: NameToIdMap,
): Promise<string[]> {
  const edgeIds: string[] = [];

  for (const relation of relations) {
    const sourceNodeId = resolveNameToId(relation.fromName, nameToIdMap);
    const targetNodeId = resolveNameToId(relation.toName, nameToIdMap);

    if (!sourceNodeId || !targetNodeId) continue;

    const edge = await prisma.kgEdge.upsert({
      where: {
        sourceNodeId_targetNodeId_relationType: {
          sourceNodeId,
          targetNodeId,
          relationType: relation.relationType,
        },
      },
      create: {
        sourceNodeId,
        targetNodeId,
        relationType: relation.relationType,
        context: relation.context,
        weight: relation.weight,
        confidence:
          typeof relation.confidence === "number"
            ? Math.min(1, Math.max(0, relation.confidence))
            : 0.6,
        metadata: {},
      },
      update: {
        context: relation.context,
        weight: relation.weight ?? undefined,
        confidence:
          typeof relation.confidence === "number"
            ? Math.min(1, Math.max(0, relation.confidence))
            : undefined,
      },
    });

    edgeIds.push(edge.id);
  }

  return edgeIds;
}
