import "server-only";

import { getCohereModelName } from "@/lib/cohere/config";
import { getCohereClient } from "@/lib/cohere/client";
import { withCohereRetry } from "@/lib/cohere/retry";

export type RerankHit<T = unknown> = {
  index: number;
  relevanceScore: number;
  document: T;
};

type RerankResponse = {
  results?: Array<{
    index: number;
    relevanceScore: number;
  }>;
};

export async function cohereRerank<T extends { text: string }>(input: {
  query: string;
  documents: T[];
  topN?: number;
  model?: string;
}): Promise<RerankHit<T>[]> {
  if (input.documents.length === 0) {
    return [];
  }

  const model = input.model ?? getCohereModelName("rerank");
  const client = getCohereClient();

  const response = (await withCohereRetry("Cohere rerank", () =>
    client.v2.rerank({
      query: input.query,
      documents: input.documents.map((doc) => doc.text),
      topN: input.topN ?? Math.min(8, input.documents.length),
      model,
    }),
  )) as RerankResponse;

  const results = response.results ?? [];
  return results.map((result) => ({
    index: result.index,
    relevanceScore: result.relevanceScore,
    document: input.documents[result.index],
  }));
}
