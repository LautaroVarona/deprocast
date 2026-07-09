import "server-only";

import { cohereEmbedQuery } from "@/lib/cohere/embed";
import { cosineSimilarity, parseEmbeddingJson } from "@/lib/mnemosyne/cosine";
import type { MemorySearchHit } from "@/lib/mnemosyne/types";
import { prisma } from "@/lib/prisma";

export async function vectorSearchMemory(input: {
  query: string;
  limit?: number;
}): Promise<MemorySearchHit[]> {
  const query = input.query.trim();
  if (!query) return [];

  const queryVector = await cohereEmbedQuery(query);
  if (queryVector.length === 0) return [];

  const records = await prisma.memoryEmbedding.findMany({
    orderBy: { updatedAt: "desc" },
    take: 2000,
  });

  const hits: MemorySearchHit[] = [];

  for (const record of records) {
    const vector = parseEmbeddingJson(record.embedding);
    if (vector.length !== queryVector.length) continue;

    const score = cosineSimilarity(queryVector, vector);
    if (score <= 0.15) continue;

    hits.push({
      id: record.id,
      sourceType: record.sourceType as MemorySearchHit["sourceType"],
      sourceId: record.sourceId,
      title: record.title,
      body: record.body,
      score,
      createdAt: record.createdAt.toISOString(),
      source: `${record.sourceType}:${record.sourceId}`,
    });
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 20);
}
