export class GcpSpeechError extends Error {
  constructor(
    message: string,
    public readonly code?: string | number,
  ) {
    super(message);
    this.name = "GcpSpeechError";
  }
}

export type PartialTranscriptionPayload = {
  rawText: string;
  confidence: number | null;
  completedChunks: number;
  totalChunks: number;
};

export class PartialTranscriptionError extends GcpSpeechError {
  constructor(
    public readonly cause: unknown,
    public readonly partial: PartialTranscriptionPayload,
  ) {
    super(humanizeGcpSpeechError(cause), getGrpcCode(cause));
    this.name = "PartialTranscriptionError";
  }
}

export function getGrpcCode(error: unknown): number | undefined {
  const code = (error as Error & { code?: string | number }).code;
  if (code === undefined) {
    return undefined;
  }
  const numeric = Number(code);
  return Number.isFinite(numeric) ? numeric : undefined;
}

export function isRetryableGcpError(error: unknown): boolean {
  const code = getGrpcCode(error);
  // 4=DEADLINE_EXCEEDED, 8=RESOURCE_EXHAUSTED, 13=INTERNAL, 14=UNAVAILABLE
  if (code !== undefined && [4, 8, 13, 14].includes(code)) {
    return true;
  }

  const raw = formatGcpError(error);
  return /RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE_EXCEEDED|rate.?limit|quota|timeout|temporarily/i.test(
    raw,
  );
}

export function formatGcpError(error: unknown): string {
  if (error instanceof GcpSpeechError) {
    return error.message;
  }

  if (error instanceof Error) {
    const grpcCode = (error as Error & { code?: string | number }).code;
    if (grpcCode !== undefined) {
      return `${error.message} (código: ${grpcCode})`;
    }
    return error.message;
  }

  return String(error);
}

export function humanizeGcpSpeechError(error: unknown): string {
  const raw = formatGcpError(error);

  if (
    /has not been used in project|it is disabled|speech\.googleapis\.com/i.test(
      raw,
    )
  ) {
    const projectMatch = raw.match(/project\s+([a-z0-9-]+)/i);
    const projectId = projectMatch?.[1] ?? "tu-proyecto";
    return (
      "La API Cloud Speech-to-Text no está habilitada en tu proyecto de Google Cloud. " +
      `Habilitala aquí: https://console.cloud.google.com/apis/library/speech.googleapis.com?project=${projectId} ` +
      "Luego esperá 2-5 minutos y volvé a procesar el audio."
    );
  }

  if (/RESOURCE_EXHAUSTED|quota exceeded|rate limit/i.test(raw)) {
    return (
      "Google Cloud limitó temporalmente las solicitudes (cuota o velocidad). " +
      "Es normal en audios largos con el Free Trial. Esperá 5-10 minutos y volvé a procesar; " +
      "si ya había progreso, se guardó la transcripción parcial."
    );
  }

  if (/PERMISSION_DENIED|403/i.test(raw)) {
    return (
      "Error de permisos o cuota en Google Cloud Speech-to-Text. Si ya transcribió varios segmentos, " +
      "probablemente alcanzaste el límite del Free Trial: esperá unos minutos y reintentá. " +
      "Si falla en el primer segmento, verificá API habilitada, facturación activa y rol " +
      "'Speech Client' en la cuenta de servicio."
    );
  }

  if (/billing|BILLING/i.test(raw)) {
    return (
      "El proyecto de Google Cloud no tiene facturación activa. " +
      "Activá una cuenta de facturación (el Free Trial alcanza) en: " +
      "https://console.cloud.google.com/billing"
    );
  }

  return raw.startsWith("Speech-to-Text") ? raw : `Speech-to-Text falló: ${raw}`;
}
