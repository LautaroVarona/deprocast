import "server-only";

import { isRetryableVertexError, VertexGeminiError } from "@/lib/vertex-gemini/errors";

const MAX_RETRIES = 5;

export async function withVertexRetry<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableVertexError(error) || attempt === MAX_RETRIES) {
        break;
      }
      const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : `${label} falló tras ${MAX_RETRIES} intentos.`;
  throw new VertexGeminiError(message);
}
