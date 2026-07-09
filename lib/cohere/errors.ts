export class CohereError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "CohereError";
  }
}

export function getCohereStatusCode(error: unknown): number | undefined {
  const status =
    (error as { statusCode?: number }).statusCode ??
    (error as { status?: number }).status;
  return typeof status === "number" ? status : undefined;
}

export function isRetryableCohereError(error: unknown): boolean {
  const status = getCohereStatusCode(error);
  if (status !== undefined && [408, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes("429") ||
    message.includes("500") ||
    message.includes("503") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("overloaded") ||
    message.includes("unavailable") ||
    message.includes("timeout") ||
    message.includes("temporarily")
  );
}

export function humanizeCohereError(error: unknown): string {
  if (error instanceof CohereError) {
    return error.message;
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("401") || lower.includes("invalid api key")) {
    return (
      "La API key de Cohere no es válida o no está configurada. " +
      "Verificá COHERE_API_KEY en tu archivo .env."
    );
  }

  if (lower.includes("402") || lower.includes("payment")) {
    return (
      "La cuenta de Cohere no tiene crédito suficiente. " +
      "Revisá tu saldo en https://dashboard.cohere.com/"
    );
  }

  if (lower.includes("429") || lower.includes("rate limit")) {
    return "Cohere limitó temporalmente las solicitudes (rate limit). Reintentá en unos segundos.";
  }

  return message.startsWith("Cohere") ? message : `Cohere falló: ${message}`;
}
