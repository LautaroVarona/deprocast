export class VertexGeminiError extends Error {
  constructor(
    message: string,
    public readonly code?: string | number,
  ) {
    super(message);
    this.name = "VertexGeminiError";
  }
}

export function getVertexErrorCode(error: unknown): number | undefined {
  const code = (error as Error & { code?: string | number }).code;
  if (code === undefined) {
    return undefined;
  }
  const numeric = Number(code);
  return Number.isFinite(numeric) ? numeric : undefined;
}

export function isRetryableVertexError(error: unknown): boolean {
  const code = getVertexErrorCode(error);
  if (code !== undefined && [4, 8, 13, 14].includes(code)) {
    return true;
  }

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes("429") ||
    message.includes("500") ||
    message.includes("503") ||
    message.includes("resource exhausted") ||
    message.includes("overloaded") ||
    message.includes("unavailable") ||
    message.includes("deadline exceeded")
  );
}
