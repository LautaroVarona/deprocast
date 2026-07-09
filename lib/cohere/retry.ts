import "server-only";

import { CohereError, isRetryableCohereError } from "@/lib/cohere/errors";

const MAX_RETRIES = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withCohereRetry<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableCohereError(error) || attempt === MAX_RETRIES) {
        break;
      }
      const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
      await sleep(delayMs);
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : `${label} falló tras ${MAX_RETRIES} intentos.`;
  throw new CohereError(message);
}
