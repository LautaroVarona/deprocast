import "server-only";

import { getCohereConfig } from "@/lib/cohere/config";
import { indexMemoryDocument } from "@/lib/mnemosyne/index";
import type { MemorySourceType } from "@/lib/mnemosyne/types";
import { prisma } from "@/lib/prisma";

export async function indexJournalMemory(input: {
  id: string;
  title: string;
  body: string;
  relativePath: string;
  onda: string;
}): Promise<void> {
  await indexMemoryDocument({
    sourceType: "journal",
    sourceId: input.id,
    title: `Diario · ${input.title}`,
    body: input.body,
    metadata: {
      relativePath: input.relativePath,
      onda: input.onda,
    },
  });
}

export async function indexKgMentionMemory(input: {
  mentionId: string;
  nodeName: string;
  fragment: string;
  sourceType: string;
  sourceId: string;
}): Promise<void> {
  if (!input.fragment.trim()) return;

  await indexMemoryDocument({
    sourceType: "kg_mention",
    sourceId: input.mentionId,
    title: `Mención · ${input.nodeName}`,
    body: input.fragment,
    metadata: {
      kgSourceType: input.sourceType,
      kgSourceId: input.sourceId,
    },
  });
}

export async function indexProjectMemory(input: {
  projectId: string;
  title: string;
  body: string;
  relativePath?: string;
}): Promise<void> {
  await indexMemoryDocument({
    sourceType: "project",
    sourceId: input.projectId,
    title: `Proyecto · ${input.title}`,
    body: input.body,
    metadata: {
      relativePath: input.relativePath,
    },
  });
}

export async function indexPurifierDocMemory(input: {
  reviewId: string;
  title: string;
  body: string;
}): Promise<void> {
  await indexMemoryDocument({
    sourceType: "purifier_doc",
    sourceId: input.reviewId,
    title: `Purificado · ${input.title}`,
    body: input.body,
  });
}

export async function indexNotebookPageMemory(input: {
  pageId: string;
  notebookTitle: string;
  pageNumber: number;
  semanticVector: string;
  structuralNotes?: string;
}): Promise<void> {
  const body = [
    input.semanticVector.trim(),
    input.structuralNotes?.trim()
      ? `\n\nNotas estructurales:\n${input.structuralNotes.trim()}`
      : "",
  ]
    .join("")
    .trim();

  if (!body) return;

  await indexMemoryDocument({
    sourceType: "notebook_page",
    sourceId: input.pageId,
    title: `${input.notebookTitle} · p.${input.pageNumber}`,
    body,
    metadata: {
      pageNumber: input.pageNumber,
    },
  });
}

export async function isMnemosyneConfigured(): Promise<boolean> {
  try {
    getCohereConfig();
    return true;
  } catch {
    return false;
  }
}

export async function countMemoryEmbeddings(): Promise<number> {
  return prisma.memoryEmbedding.count();
}

export async function listMemorySourceTypes(): Promise<MemorySourceType[]> {
  const rows = await prisma.memoryEmbedding.findMany({
    distinct: ["sourceType"],
    select: { sourceType: true },
  });
  return rows.map((row) => row.sourceType as MemorySourceType);
}
