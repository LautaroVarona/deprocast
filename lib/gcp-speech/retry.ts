import { isRetryableGcpError } from "@/lib/gcp-speech/errors";
import { logInfo } from "@/lib/gcp-speech/logger";

const MAX_ATTEMPTS = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withGcpRetry<T>(
  assetId: string,
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetryableGcpError(error) || attempt === MAX_ATTEMPTS) {
        throw error;
      }

      const waitMs = 2000 * attempt;
      logInfo(
        assetId,
        `${label} — error temporal, reintento ${attempt}/${MAX_ATTEMPTS - 1} en ${waitMs / 1000}s...`,
      );
      await sleep(waitMs);
    }
  }

  throw lastError;
}

export async function pauseBetweenChunks(assetId: string): Promise<void> {
  const delayMs = Number.parseInt(
    process.env.GCP_SPEECH_CHUNK_DELAY_MS ?? "400",
    10,
  );

  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    return;
  }

  await sleep(delayMs);
}
