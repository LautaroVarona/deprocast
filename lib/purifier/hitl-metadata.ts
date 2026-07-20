import type { IngestaChannel } from "@/lib/purifier/constants";
import type { PurifierReviewRecord } from "@/lib/purifier/types";

export const MATERIA_OPTIONS = [
  { value: "texto", label: "Texto" },
  { value: "audio/transcript", label: "Audio · Transcripción" },
  { value: "tablas/estructurado", label: "Tablas · Estructurado" },
  { value: "vision/ocr", label: "Visión · OCR" },
  { value: "imagen", label: "Imagen" },
  { value: "documento/pdf", label: "Documento · PDF" },
] as const;

export const ORIGEN_OPTIONS = [
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile" },
  { value: "telegram", label: "Telegram" },
  { value: "local-atanor", label: "Atanor local" },
] as const;

export type MateriaValue = (typeof MATERIA_OPTIONS)[number]["value"];
export type OrigenValue = (typeof ORIGEN_OPTIONS)[number]["value"];

const CHANNEL_MATERIA: Record<IngestaChannel, MateriaValue> = {
  texto: "texto",
  audio: "audio/transcript",
  tablas: "tablas/estructurado",
  vision: "vision/ocr",
  "x-bookmarks": "texto",
};

const CHANNEL_ORIGEN: Record<IngestaChannel, OrigenValue> = {
  texto: "web",
  audio: "web",
  tablas: "web",
  vision: "web",
  "x-bookmarks": "web",
};

const MATERIA_ALIASES: Record<string, MateriaValue> = {
  texto: "texto",
  text: "texto",
  "text/markdown": "texto",
  texto_directo: "texto",
  "texto-directo": "texto",
  cuaderno: "vision/ocr",
  cuadernos: "vision/ocr",
  "audio/transcript": "audio/transcript",
  audio: "audio/transcript",
  "audio/wav": "audio/transcript",
  stt_audio: "audio/transcript",
  "stt-audio": "audio/transcript",
  tablas: "tablas/estructurado",
  "tablas/estructurado": "tablas/estructurado",
  vision: "vision/ocr",
  "vision/ocr": "vision/ocr",
  "image/png": "vision/ocr",
  imagen: "imagen",
  pdf: "documento/pdf",
};

/** Canales con materia canónica: un suggested que la contradiga pierde ante el canal. */
const CHANNEL_LOCKED: ReadonlySet<string> = new Set([
  "texto",
  "audio",
  "tablas",
  "vision",
  "x-bookmarks",
]);

function isMateriaValue(value: string): value is MateriaValue {
  return MATERIA_OPTIONS.some((option) => option.value === value);
}

function isOrigenValue(value: string): value is OrigenValue {
  return ORIGEN_OPTIONS.some((option) => option.value === value);
}

export function inferMateriaFromChannel(channel: string | null | undefined): MateriaValue {
  if (channel && channel in CHANNEL_MATERIA) {
    return CHANNEL_MATERIA[channel as IngestaChannel];
  }
  return "texto";
}

export function inferOrigenFromChannel(channel: string | null | undefined): OrigenValue {
  if (channel && channel in CHANNEL_ORIGEN) {
    return CHANNEL_ORIGEN[channel as IngestaChannel];
  }
  return "web";
}

export function normalizeMateria(
  suggested: string | undefined,
  channel: string | null | undefined,
): MateriaValue {
  const fromChannel = inferMateriaFromChannel(channel);
  const channelKnown = Boolean(channel && CHANNEL_LOCKED.has(channel));

  const normalized = suggested?.trim().toLowerCase() ?? "";
  let resolved: MateriaValue | null = null;

  if (isMateriaValue(normalized)) {
    resolved = normalized;
  } else {
    const alias = MATERIA_ALIASES[normalized];
    if (alias) resolved = alias;
  }

  // Canal conocido gana si el LLM (o un default viejo) contradice el origen real.
  if (channelKnown && resolved !== null && resolved !== fromChannel) {
    return fromChannel;
  }

  return resolved ?? fromChannel;
}

export function normalizeOrigen(
  suggested: string | undefined,
  channel: string | null | undefined,
): OrigenValue {
  const normalized = suggested?.trim().toLowerCase() ?? "";
  if (isOrigenValue(normalized)) return normalized;

  if (normalized.includes("telegram")) return "telegram";
  if (normalized.includes("mobile") || normalized.includes("celular")) {
    return "mobile";
  }
  if (normalized.includes("web")) return "web";
  if (normalized.includes("atanor") || normalized.includes("local")) {
    return "local-atanor";
  }

  return inferOrigenFromChannel(channel);
}

export function resolveIngestTimestamp(record: PurifierReviewRecord): string {
  const fromMetadata = record.source.metadata.created_at;
  if (typeof fromMetadata === "string" && fromMetadata.trim()) {
    return fromMetadata;
  }

  const filenameMatch = record.source.filename.match(/^(\d{10})_/);
  if (filenameMatch) {
    const seconds = Number(filenameMatch[1]);
    if (!Number.isNaN(seconds)) {
      return new Date(seconds * 1000).toISOString();
    }
  }

  return record.processedAt;
}

export function formatIngestTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const formatted = date.toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatted.replace(",", "");
}

export function toIsoDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}
