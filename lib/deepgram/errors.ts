import { SttError } from "@/lib/stt/errors";

export class DeepgramSpeechError extends SttError {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message, statusCode);
    this.name = "DeepgramSpeechError";
  }
}

export type PartialTranscriptionPayload = {
  rawText: string;
  confidence: number | null;
  completedChunks: number;
  totalChunks: number;
};

export class PartialTranscriptionError extends DeepgramSpeechError {
  constructor(
    public readonly cause: unknown,
    public readonly partial: PartialTranscriptionPayload,
  ) {
    super(humanizeDeepgramError(cause), getStatusCode(cause));
    this.name = "PartialTranscriptionError";
  }
}

export function getStatusCode(error: unknown): number | undefined {
  const statusCode = (error as Error & { statusCode?: number }).statusCode;
  return typeof statusCode === "number" ? statusCode : undefined;
}

export function isRetryableDeepgramError(error: unknown): boolean {
  const statusCode = getStatusCode(error);
  if (statusCode !== undefined && [408, 429, 500, 502, 503, 504].includes(statusCode)) {
    return true;
  }

  const raw = formatDeepgramError(error);
  return /rate.?limit|quota|timeout|temporarily|too many requests|service unavailable/i.test(
    raw,
  );
}

export function formatDeepgramError(error: unknown): string {
  if (error instanceof DeepgramSpeechError) {
    return error.message;
  }

  if (error instanceof Error) {
    const statusCode = (error as Error & { statusCode?: number }).statusCode;
    if (statusCode !== undefined) {
      return `${error.message} (código HTTP: ${statusCode})`;
    }
    return error.message;
  }

  return String(error);
}

export function humanizeDeepgramError(error: unknown): string {
  const raw = formatDeepgramError(error);

  if (/401|unauthorized|invalid api key|invalid credentials/i.test(raw)) {
    return (
      "La API key de Deepgram no es válida o no está configurada. " +
      "Verificá DEEPGRAM_API_KEY en tu archivo .env."
    );
  }

  if (/402|payment|insufficient|balance/i.test(raw)) {
    return (
      "La cuenta de Deepgram no tiene crédito suficiente. " +
      "Revisá tu saldo en https://console.deepgram.com/"
    );
  }

  if (/429|rate limit|too many requests/i.test(raw)) {
    return (
      "Deepgram limitó temporalmente las solicitudes (rate limit). " +
      "Esperá unos minutos y volvé a procesar; si ya había progreso, se guardó la transcripción parcial."
    );
  }

  if (/5\d{2}|service unavailable|internal server/i.test(raw)) {
    return (
      "Deepgram respondió con un error temporal del servidor. " +
      "Reintentá en unos minutos."
    );
  }

  return raw.startsWith("Deepgram") ? raw : `Deepgram falló: ${raw}`;
}

export function isEmptyDeepgramTranscriptionError(error: unknown): boolean {
  const raw = formatDeepgramError(error).toLowerCase();
  return (
    raw.includes("transcripción vacía") ||
    raw.includes("transcripcion vacia") ||
    raw.includes("devolvió una transcripción vacía") ||
    raw.includes("returned an empty transcription")
  );
}
