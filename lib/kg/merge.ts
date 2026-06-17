import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  normalizeName,
  parseAliasesJson,
  parseMetadataJson,
} from "@/lib/kg/normalize";

export type MergeNodesResult = {
  keptNodeId: string;
  droppedNodeId: string;
  movedEdges: number;
  movedMentions: number;
  mergedAliases: number;
};

/**
 * Fusiona dos nodos del grafo en uno solo (resolucion de entidades duplicadas).
 * - Repunta edges y menciones del nodo descartado hacia el canonico.
 * - Une alias y metadata (gana el canonico salvo claves ausentes).
 * - Deduplica edges resultantes por la clave unica (source,target,relation).
 * - Elimina el nodo descartado.
 *
 * `keepId` es el nodo canonico que sobrevive; `dropId` se absorbe y desaparece.
 */
export async function mergeNodes(
  keepId: string,
  dropId: string,
): Promise<MergeNodesResult> {
  if (keepId === dropId) {
    throw new Error("No se puede fusionar un nodo consigo mismo.");
  }

  return prisma.$transaction(async (tx) => {
    const keep = await tx.kgNode.findUnique({ where: { id: keepId } });
    const drop = await tx.kgNode.findUnique({ where: { id: dropId } });

    if (!keep) throw new Error(`Nodo canonico no encontrado: ${keepId}`);
    if (!drop) throw new Error(`Nodo a fusionar no encontrado: ${dropId}`);

    // 1. Unir alias (incluido el primaryName del nodo descartado).
    const keepAliases = parseAliasesJson(keep.aliases);
    const dropAliases = parseAliasesJson(drop.aliases);
    const aliasSet = new Map<string, string>();
    for (const alias of [...keepAliases, drop.primaryName, ...dropAliases]) {
      const trimmed = alias.trim();
      if (!trimmed) continue;
      if (normalizeName(trimmed) === normalizeName(keep.primaryName)) continue;
      aliasSet.set(normalizeName(trimmed), trimmed);
    }
    const mergedAliases = [...aliasSet.values()];

    // 2. Unir metadata (el canonico tiene prioridad).
    const mergedMetadata = {
      ...parseMetadataJson(drop.metadata),
      ...parseMetadataJson(keep.metadata),
    };

    // 3. Mover menciones.
    const movedMentions = await tx.kgMention.updateMany({
      where: { nodeId: dropId },
      data: { nodeId: keepId },
    });

    // 4. Mover edges salientes/entrantes evitando colisiones de unicidad.
    let movedEdges = 0;

    const outgoing = await tx.kgEdge.findMany({
      where: { sourceNodeId: dropId },
    });
    for (const edge of outgoing) {
      const targetNodeId = edge.targetNodeId === dropId ? keepId : edge.targetNodeId;
      if (targetNodeId === keepId) {
        // Se convertiria en bucle sobre el canonico: descartar.
        await tx.kgEdge.delete({ where: { id: edge.id } });
        continue;
      }
      const clash = await tx.kgEdge.findUnique({
        where: {
          sourceNodeId_targetNodeId_relationType: {
            sourceNodeId: keepId,
            targetNodeId,
            relationType: edge.relationType,
          },
        },
      });
      if (clash) {
        await tx.kgEdge.delete({ where: { id: edge.id } });
      } else {
        await tx.kgEdge.update({
          where: { id: edge.id },
          data: { sourceNodeId: keepId, targetNodeId },
        });
        movedEdges += 1;
      }
    }

    const incoming = await tx.kgEdge.findMany({
      where: { targetNodeId: dropId },
    });
    for (const edge of incoming) {
      const sourceNodeId = edge.sourceNodeId === dropId ? keepId : edge.sourceNodeId;
      if (sourceNodeId === keepId) {
        await tx.kgEdge.delete({ where: { id: edge.id } });
        continue;
      }
      const clash = await tx.kgEdge.findUnique({
        where: {
          sourceNodeId_targetNodeId_relationType: {
            sourceNodeId,
            targetNodeId: keepId,
            relationType: edge.relationType,
          },
        },
      });
      if (clash) {
        await tx.kgEdge.delete({ where: { id: edge.id } });
      } else {
        await tx.kgEdge.update({
          where: { id: edge.id },
          data: { sourceNodeId, targetNodeId: keepId },
        });
        movedEdges += 1;
      }
    }

    // 5. Actualizar el canonico (alias, metadata, confianza reforzada).
    const reinforced = Math.min(
      1,
      Math.max(keep.confidence, drop.confidence) +
        (1 - Math.max(keep.confidence, drop.confidence)) * 0.2,
    );
    await tx.kgNode.update({
      where: { id: keepId },
      data: {
        aliases: mergedAliases,
        metadata: mergedMetadata as Prisma.InputJsonValue,
        confidence: reinforced,
      },
    });

    // 6. Eliminar el nodo absorbido.
    await tx.kgNode.delete({ where: { id: dropId } });

    return {
      keptNodeId: keepId,
      droppedNodeId: dropId,
      movedEdges,
      movedMentions: movedMentions.count,
      mergedAliases: mergedAliases.length,
    };
  });
}
