import "server-only";

import { ingestDocumentSource } from "@/lib/kg/sources/common";
import type { RelationType } from "@/lib/kg/types";
import type { LinkCorpusInput } from "@/lib/enciclopedia/types";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const ALLOWED_RELATIONS: RelationType[] = [
  "define",
  "relacionado_con",
  "relevante_para",
  "menciona_a",
  "documenta",
];

export async function linkEntryToCorpus(
  input: LinkCorpusInput,
): Promise<{ kgNodeId: string; edgesCreated: number }> {
  const entry = await prisma.encyclopediaEntry.findUnique({
    where: { id: input.entryId },
  });
  if (!entry) {
    throw new Error("Entrada no encontrada.");
  }

  if (input.targets.length === 0) {
    throw new Error("Seleccioná al menos un nodo del Corpus.");
  }

  let conceptNodeId = entry.kgNodeId;

  if (!conceptNodeId) {
    const byTitle = await prisma.kgNode.findFirst({
      where: {
        type: "concepto",
        primaryName: entry.title,
      },
    });

    if (byTitle) {
      conceptNodeId = byTitle.id;
    } else {
      const created = await prisma.kgNode.create({
        data: {
          primaryName: entry.title,
          type: "concepto",
          aliases: [entry.slug],
          metadata: {
            encyclopediaSlug: entry.slug,
            source: "enciclopedia",
          } as Prisma.InputJsonValue,
          confidence: 0.75,
        },
      });
      conceptNodeId = created.id;
    }

    await prisma.encyclopediaEntry.update({
      where: { id: entry.id },
      data: { kgNodeId: conceptNodeId },
    });
  }

  await ingestDocumentSource({
    sourceType: "encyclopedia_entry",
    sourceId: entry.id,
    documentPath: `enciclopedia:${entry.slug}`,
    title: entry.title,
    body: entry.body,
    documentMeta: {
      slug: entry.slug,
      encyclopediaEntryId: entry.id,
    },
    connectDocument: true,
  });

  let edgesCreated = 0;

  for (const target of input.targets) {
    if (!ALLOWED_RELATIONS.includes(target.relationType as RelationType)) {
      throw new Error(`Relación no permitida: ${target.relationType}`);
    }

    const targetNode = await prisma.kgNode.findUnique({
      where: { id: target.nodeId },
    });
    if (!targetNode) {
      throw new Error(`Nodo del Corpus no encontrado: ${target.nodeId}`);
    }

    await prisma.kgEdge.upsert({
      where: {
        sourceNodeId_targetNodeId_relationType: {
          sourceNodeId: conceptNodeId,
          targetNodeId: target.nodeId,
          relationType: target.relationType,
        },
      },
      create: {
        sourceNodeId: conceptNodeId,
        targetNodeId: target.nodeId,
        relationType: target.relationType,
        context:
          target.context?.trim() ||
          `Vinculado desde Enciclopedia: ${entry.title}`,
        confidence: 0.85,
        metadata: {
          encyclopediaEntryId: entry.id,
        } as Prisma.InputJsonValue,
      },
      update: {
        context: target.context?.trim() || undefined,
      },
    });

    edgesCreated += 1;
  }

  return { kgNodeId: conceptNodeId, edgesCreated };
}
