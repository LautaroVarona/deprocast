import "server-only";

import { createHash } from "node:crypto";

import { cohereEmbedDocuments } from "@/lib/cohere/embed";
import { getCohereModelName } from "@/lib/cohere/config";
import { chunkTextForEmbedding } from "@/lib/mnemosyne/chunker";
import type { MemoryChunkInput, MemorySourceType } from "@/lib/mnemosyne/types";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

let warnedMissingMemoryTable = false;

function isMissingMemoryTableError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2021" &&
    (error.meta?.modelName === "MemoryEmbedding" ||
      String(error.message).includes("MemoryEmbedding"))
  );
}

function warnMissingMemoryTableOnce(): void {
  if (warnedMissingMemoryTable) {
    return;
  }
  warnedMissingMemoryTable = true;
  console.warn(
    "[mnemosyne] Falta la tabla MemoryEmbedding. Ejecutá `npm run db:meta` para habilitar el índice vectorial.",
  );
}

function hashContent(parts: string[]): string {
  return createHash("sha256").update(parts.join("\n---\n")).digest("hex");
}

export async function indexMemoryDocument(input: {
  sourceType: MemorySourceType;
  sourceId: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}): Promise<{ indexed: number; skipped: boolean }> {
  try {
    const chunks = chunkTextForEmbedding(input.body);
    if (chunks.length === 0) {
      return { indexed: 0, skipped: true };
    }

    const contentHash = hashContent([input.title, ...chunks]);
    const existing = await prisma.memoryEmbedding.findFirst({
      where: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        contentHash,
      },
      select: { id: true },
    });

    if (existing) {
      return { indexed: 0, skipped: true };
    }

    await prisma.memoryEmbedding.deleteMany({
      where: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    });

    const embedTexts = chunks.map(
      (chunk) => `${input.title}\n\n${chunk}`.trim(),
    );
    const vectors = await cohereEmbedDocuments(embedTexts);
    const embedModel = getCohereModelName("embed");
    const dimensions = vectors[0]?.length ?? 0;

    if (dimensions === 0) {
      return { indexed: 0, skipped: true };
    }

    await prisma.$transaction(
      chunks.map((chunk, index) =>
        prisma.memoryEmbedding.create({
          data: {
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            chunkIndex: index,
            title: input.title,
            body: chunk,
            contentHash,
            embedModel,
            dimensions,
            embedding: JSON.stringify(vectors[index] ?? []),
            metadata: {
              ...(input.metadata ?? {}),
              chunkCount: chunks.length,
            },
          },
        }),
      ),
    );

    void import("@/lib/historial/domain-log")
      .then(({ logMemoryIndexedActivity }) =>
        logMemoryIndexedActivity({
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          title: input.title,
          chunkCount: chunks.length,
          contentHash,
          embedModel,
        }),
      )
      .catch((error) => {
        console.error("Historial memory index log error:", error);
      });

    return { indexed: chunks.length, skipped: false };
  } catch (error) {
    if (isMissingMemoryTableError(error)) {
      warnMissingMemoryTableOnce();
      return { indexed: 0, skipped: true };
    }
    throw error;
  }
}

export async function indexMemoryChunks(chunks: MemoryChunkInput[]): Promise<number> {
  let indexed = 0;
  for (const chunk of chunks) {
    const result = await indexMemoryDocument({
      sourceType: chunk.sourceType,
      sourceId: `${chunk.sourceId}#${chunk.chunkIndex}`,
      title: chunk.title,
      body: chunk.body,
      metadata: chunk.metadata,
    });
    indexed += result.indexed;
  }
  return indexed;
}
