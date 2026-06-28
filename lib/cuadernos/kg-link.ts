import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function notebookDocumentName(notebookId: string): string {
  return `cuaderno:${notebookId}`;
}

export async function ensureNotebookDocumentNode(
  notebookId: string,
  title: string,
): Promise<string> {
  const primaryName = notebookDocumentName(notebookId);
  const node = await prisma.kgNode.upsert({
    where: { primaryName_type: { primaryName, type: "documento" } },
    create: {
      primaryName,
      type: "documento",
      aliases: [title.trim()],
      metadata: {
        notebookId,
        source: "cuadernos",
      } as Prisma.InputJsonValue,
      confidence: 0.9,
    },
    update: {
      aliases: [title.trim()],
      metadata: {
        notebookId,
        source: "cuadernos",
      } as Prisma.InputJsonValue,
    },
  });

  return node.id;
}

export async function linkNotebookAuthor(
  notebookId: string,
  title: string,
  authorPersonaId: string | null,
): Promise<void> {
  const documentNodeId = await ensureNotebookDocumentNode(notebookId, title);

  const existingEdges = await prisma.kgEdge.findMany({
    where: {
      targetNodeId: documentNodeId,
      relationType: "autor_de",
    },
    select: { id: true, sourceNodeId: true },
  });

  if (authorPersonaId) {
    const persona = await prisma.kgNode.findFirst({
      where: { id: authorPersonaId, type: "persona" },
      select: { id: true },
    });
    if (!persona) {
      throw new Error("La persona autora no existe en el grafo.");
    }

    for (const edge of existingEdges) {
      if (edge.sourceNodeId !== authorPersonaId) {
        await prisma.kgEdge.delete({ where: { id: edge.id } });
      }
    }

    await prisma.kgEdge.upsert({
      where: {
        sourceNodeId_targetNodeId_relationType: {
          sourceNodeId: authorPersonaId,
          targetNodeId: documentNodeId,
          relationType: "autor_de",
        },
      },
      create: {
        sourceNodeId: authorPersonaId,
        targetNodeId: documentNodeId,
        relationType: "autor_de",
        context: `${title} — autor vinculado desde cuadernos/libros.`,
        weight: 8,
        confidence: 0.95,
        metadata: { notebookId } as Prisma.InputJsonValue,
      },
      update: {
        context: `${title} — autor vinculado desde cuadernos/libros.`,
        weight: 8,
        confidence: 0.95,
      },
    });
    return;
  }

  if (existingEdges.length > 0) {
    await prisma.kgEdge.deleteMany({
      where: { id: { in: existingEdges.map((edge) => edge.id) } },
    });
  }
}
