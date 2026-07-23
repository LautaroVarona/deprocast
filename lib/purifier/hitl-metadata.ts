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

/** Vector de entrada físico (sin ambigüedad de canal lógico). */
export const ORIGEN_OPTIONS = [
  { value: "ingesta-web", label: "Ingesta Web" },
  { value: "editor-directo", label: "Editor Directo" },
  { value: "extension-recorte", label: "Extensión / Recorte" },
  { value: "mobile", label: "Mobile" },
  { value: "telegram", label: "Telegram" },
] as const;

/** Onda = estado de energía requerido para procesar la materia. */
export const ONDA_OPTIONS = [
  { value: "foco-profundo", label: "Foco Profundo" },
  { value: "tramite-rapido", label: "Trámite Rápido" },
  { value: "exploracion", label: "Exploración" },
  { value: "revision-critica", label: "Revisión Crítica" },
  { value: "sin-clasificar", label: "Sin clasificar" },
] as const;

/** Posición = rol activo / sombrero del Observador al capturar. */
export const POSICION_OPTIONS = [
  { value: "observador", label: "Observador" },
  { value: "jugador", label: "Jugador" },
  { value: "arquitecto", label: "Arquitecto" },
  { value: "operador", label: "Operador" },
  { value: "avatar", label: "Avatar" },
] as const;

export type MateriaValue = (typeof MATERIA_OPTIONS)[number]["value"];
export type OrigenValue = (typeof ORIGEN_OPTIONS)[number]["value"];
export type OndaValue = (typeof ONDA_OPTIONS)[number]["value"];
export type PosicionValue = (typeof POSICION_OPTIONS)[number]["value"];

const CHANNEL_MATERIA: Record<IngestaChannel, MateriaValue> = {
  texto: "texto",
  audio: "audio/transcript",
  tablas: "tablas/estructurado",
  vision: "vision/ocr",
  "x-bookmarks": "texto",
};

const CHANNEL_ORIGEN: Record<IngestaChannel, OrigenValue> = {
  texto: "ingesta-web",
  audio: "ingesta-web",
  tablas: "ingesta-web",
  vision: "ingesta-web",
  "x-bookmarks": "extension-recorte",
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

const ORIGEN_ALIASES: Record<string, OrigenValue> = {
  web: "ingesta-web",
  "ingesta-web": "ingesta-web",
  "ingesta web": "ingesta-web",
  "local-atanor": "editor-directo",
  "editor-directo": "editor-directo",
  "editor directo": "editor-directo",
  atanor: "editor-directo",
  local: "editor-directo",
  "extension-recorte": "extension-recorte",
  extension: "extension-recorte",
  recorte: "extension-recorte",
  "web_clip": "extension-recorte",
  "web-clip": "extension-recorte",
  mobile: "mobile",
  celular: "mobile",
  telegram: "telegram",
};

const ONDA_ALIASES: Record<string, OndaValue> = {
  "foco-profundo": "foco-profundo",
  "foco profundo": "foco-profundo",
  deep: "foco-profundo",
  "tramite-rapido": "tramite-rapido",
  "trámite rápido": "tramite-rapido",
  "tramite rapido": "tramite-rapido",
  quick: "tramite-rapido",
  exploracion: "exploracion",
  exploración: "exploracion",
  "revision-critica": "revision-critica",
  "revisión crítica": "revision-critica",
  "sin-clasificar": "sin-clasificar",
};

const POSICION_ALIASES: Record<string, PosicionValue> = {
  observador: "observador",
  jugador: "jugador",
  arquitecto: "arquitecto",
  operador: "operador",
  avatar: "avatar",
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

function isOndaValue(value: string): value is OndaValue {
  return ONDA_OPTIONS.some((option) => option.value === value);
}

function isPosicionValue(value: string): value is PosicionValue {
  return POSICION_OPTIONS.some((option) => option.value === value);
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
  return "ingesta-web";
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

  const alias = ORIGEN_ALIASES[normalized];
  if (alias) return alias;

  if (normalized.includes("telegram")) return "telegram";
  if (normalized.includes("mobile") || normalized.includes("celular")) {
    return "mobile";
  }
  if (normalized.includes("extension") || normalized.includes("recorte") || normalized.includes("clip")) {
    return "extension-recorte";
  }
  if (normalized.includes("editor") || normalized.includes("atanor") || normalized.includes("local")) {
    return "editor-directo";
  }
  if (normalized.includes("web") || normalized.includes("ingesta")) {
    return "ingesta-web";
  }

  return inferOrigenFromChannel(channel);
}

export function normalizeOnda(suggested: string | undefined): OndaValue {
  const normalized = suggested?.trim().toLowerCase() ?? "";
  if (isOndaValue(normalized)) return normalized;
  return ONDA_ALIASES[normalized] ?? "sin-clasificar";
}

export function normalizePosicion(suggested: string | undefined): PosicionValue {
  const normalized = suggested?.trim().toLowerCase() ?? "";
  if (isPosicionValue(normalized)) return normalized;
  return POSICION_ALIASES[normalized] ?? "observador";
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
