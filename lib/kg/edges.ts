import { resolveNameToId, type NameToIdMap } from "@/lib/kg/identity";
import { prisma } from "@/lib/prisma";
import type { LlmRelation } from "@/lib/kg/types";
import {
  DEFAULT_KG_EDGE_WEIGHT,
  normalizeKgEdgeWeight,
} from "@/lib/validations/kg-schema";

export async function createEdgesFromExtraction(
  relations: LlmRelation[],
  nameToIdMap: NameToIdMap,
): Promise<string[]> {
  const edgeIds: string[] = [];

  for (const relation of relations) {
    const sourceNodeId = resolveNameToId(relation.fromName, nameToIdMap);
    const targetNodeId = resolveNameToId(relation.toName, nameToIdMap);

    if (!sourceNodeId || !targetNodeId) continue;

    const normalized =
      relation.weight !== undefined && relation.weight !== null
        ? normalizeKgEdgeWeight(relation.weight)
        : { weight: DEFAULT_KG_EDGE_WEIGHT, fellBack: false, original: undefined };

    if (normalized.fellBack) {
      void import("@/lib/historial/log").then(({ logActivity }) =>
        logActivity({
          category: "kg",
          action: "kg_ingested",
          title: "Peso de arista fuera de escala 1–12",
          summary: `Fallback a ${normalized.weight} (original: ${String(normalized.original)})`,
          metadata: {
            weightFallback: true,
            fromName: relation.fromName,
            toName: relation.toName,
            relationType: relation.relationType,
            originalWeight: normalized.original,
            fallbackWeight: normalized.weight,
          },
        }),
      );
    }

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
        weight: normalized.weight,
        confidence:
          typeof relation.confidence === "number"
            ? Math.min(1, Math.max(0, relation.confidence))
            : 0.6,
        metadata: normalized.fellBack
          ? {
              weightFallback: true,
              originalWeight:
                normalized.original === undefined ||
                normalized.original === null
                  ? null
                  : typeof normalized.original === "object"
                    ? JSON.stringify(normalized.original)
                    : (normalized.original as string | number | boolean),
            }
          : {},
      },
      update: {
        context: relation.context,
        weight: normalized.weight,
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
