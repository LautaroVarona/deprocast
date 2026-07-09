import "server-only";

import { CohereClient } from "cohere-ai";

import { getCohereConfig } from "@/lib/cohere/config";

let cachedClient: CohereClient | null = null;

export function getCohereClient(): CohereClient {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getCohereConfig();
  cachedClient = new CohereClient({ token: config.apiKey });
  return cachedClient;
}
