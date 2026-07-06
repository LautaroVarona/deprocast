export const ARCHIVO_KINDS = [
  "raw_document",
  "audio_transcript",
  "journal",
  "cuaderno_page",
  "project",
  "purifier_review",
] as const;

export type ArchivoKind = (typeof ARCHIVO_KINDS)[number];

export type StrongestTagKind =
  | "campo"
  | "area"
  | "tag"
  | "base_weight"
  | "project"
  | "onda"
  | "prioridad";

export type StrongestTag = {
  label: string;
  weight: number;
  kind: StrongestTagKind;
};

export type ArchivoItemSummary = {
  id: string;
  kind: ArchivoKind;
  sourceId: string;
  title: string;
  preview: string;
  charCount: number;
  createdAt: string;
  updatedAt: string | null;
  fuenteOrigen: string;
  strongestTag: StrongestTag | null;
  meta: Record<string, string | null>;
};

export type ArchivoItemDetail = ArchivoItemSummary & {
  content: string;
  deepLink: string | null;
};

export type ArchivoSearchHit = ArchivoItemSummary & {
  score: number;
  snippet: string;
};

export type ArchivoListResult = {
  items: ArchivoItemSummary[];
  total: number;
  byKind: Record<ArchivoKind, number>;
};

export function buildArchivoId(kind: ArchivoKind, sourceId: string): string {
  return `${kind}:${sourceId}`;
}

export function parseArchivoId(id: string): { kind: ArchivoKind; sourceId: string } | null {
  const separator = id.indexOf(":");
  if (separator <= 0) return null;

  const kind = id.slice(0, separator) as ArchivoKind;
  const sourceId = id.slice(separator + 1);
  if (!ARCHIVO_KINDS.includes(kind) || !sourceId) return null;

  return { kind, sourceId };
}

export const ARCHIVO_KIND_LABELS: Record<ArchivoKind, string> = {
  raw_document: "Documento crudo",
  audio_transcript: "Transcripción",
  journal: "Diario",
  cuaderno_page: "Cuaderno",
  project: "Proyecto",
  purifier_review: "Purifier",
};
