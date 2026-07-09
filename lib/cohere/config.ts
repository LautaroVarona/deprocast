import "dotenv/config";

import { CohereError } from "@/lib/cohere/errors";

export type CohereModelKind = "default" | "fast" | "vision" | "embed" | "rerank";

export type CohereConfig = {
  apiKey: string;
  model: string;
  modelFast: string;
  visionModel: string;
  embedModel: string;
  rerankModel: string;
  requestDelayMs: number;
  maxOutputTokens: number;
};

let cachedConfig: CohereConfig | null = null;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getCohereConfig(): CohereConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const apiKey = process.env.COHERE_API_KEY?.trim();
  if (!apiKey) {
    throw new CohereError(
      "Falta COHERE_API_KEY. Configurá tu API key de Cohere en .env.",
    );
  }

  cachedConfig = {
    apiKey,
    model: process.env.COHERE_MODEL?.trim() || "command-r-plus-08-2024",
    modelFast: process.env.COHERE_MODEL_FAST?.trim() || "command-r-08-2024",
    visionModel:
      process.env.COHERE_VISION_MODEL?.trim() || "command-a-vision-07-2025",
    embedModel: process.env.COHERE_EMBED_MODEL?.trim() || "embed-v4.0",
    rerankModel: process.env.COHERE_RERANK_MODEL?.trim() || "rerank-v3.5",
    requestDelayMs: parsePositiveInt(
      process.env.COHERE_REQUEST_DELAY_MS,
      500,
    ),
    maxOutputTokens: parsePositiveInt(
      process.env.COHERE_MAX_OUTPUT_TOKENS,
      2048,
    ),
  };

  return cachedConfig;
}

export function getCohereModelName(kind: CohereModelKind = "default"): string {
  const config = getCohereConfig();
  switch (kind) {
    case "fast":
      return config.modelFast;
    case "vision":
      return config.visionModel;
    case "embed":
      return config.embedModel;
    case "rerank":
      return config.rerankModel;
    default:
      return config.model;
  }
}

export async function pauseBetweenCohereRequests(): Promise<void> {
  const delayMs = getCohereConfig().requestDelayMs;
  if (delayMs <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
