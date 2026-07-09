import "dotenv/config";

export type DeepgramConfig = {
  apiKey: string;
  model: string;
  language: string;
  chunkSeconds: number;
  syncMaxSeconds: number;
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

let cachedConfig: DeepgramConfig | null = null;

export function getDeepgramConfig(): DeepgramConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const apiKey = process.env.DEEPGRAM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Falta DEEPGRAM_API_KEY. Configurá tu API key de Deepgram en .env.",
    );
  }

  const model = process.env.DEEPGRAM_MODEL?.trim() || "nova-3";
  const language = process.env.DEEPGRAM_LANGUAGE?.trim() || "es";
  const chunkSeconds = parsePositiveInt(
    process.env.DEEPGRAM_CHUNK_SECONDS,
    50,
  );
  const syncMaxSeconds = parsePositiveInt(
    process.env.DEEPGRAM_SYNC_MAX_SECONDS,
    55,
  );

  cachedConfig = {
    apiKey,
    model,
    language,
    chunkSeconds,
    syncMaxSeconds,
  };

  return cachedConfig;
}
