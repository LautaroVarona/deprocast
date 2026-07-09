import "server-only";

import { getCohereModelName } from "@/lib/cohere/config";
import { getCohereClient } from "@/lib/cohere/client";
import { CohereError } from "@/lib/cohere/errors";
import { withCohereRetry } from "@/lib/cohere/retry";

export type EmbedInputType =
  | "search_document"
  | "search_query"
  | "classification"
  | "clustering";

type EmbedResponse = {
  embeddings?: {
    float?: number[][];
  };
};

export async function cohereEmbedTexts(input: {
  texts: string[];
  inputType: EmbedInputType;
  model?: string;
}): Promise<number[][]> {
  if (input.texts.length === 0) {
    return [];
  }

  const model = input.model ?? getCohereModelName("embed");
  const client = getCohereClient();

  const response = (await withCohereRetry("Cohere embed", () =>
    client.v2.embed({
      texts: input.texts,
      model,
      inputType: input.inputType,
      embeddingTypes: ["float"],
    }),
  )) as EmbedResponse;

  const vectors = response.embeddings?.float;
  if (!vectors || vectors.length !== input.texts.length) {
    throw new CohereError("Cohere embed devolvió un formato inesperado.");
  }

  return vectors;
}

export async function cohereEmbedQuery(query: string): Promise<number[]> {
  const [vector] = await cohereEmbedTexts({
    texts: [query],
    inputType: "search_query",
  });
  return vector ?? [];
}

export async function cohereEmbedDocuments(texts: string[]): Promise<number[][]> {
  return cohereEmbedTexts({
    texts,
    inputType: "search_document",
  });
}
