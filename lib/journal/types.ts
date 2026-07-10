export const JOURNAL_ONDAS = [
  "DIARIO",
  "SUEÑO_NOCTURNO",
  "VISION_OBJETIVO",
  "MENTAL_DUMP",
] as const;

export type JournalOnda = (typeof JOURNAL_ONDAS)[number];

export type JournalWaveTab = {
  id: JournalOnda;
  label: string;
  icon: string;
  shortLabel: string;
};

export type SaveJournalInput = {
  content: string;
  onda: JournalOnda;
  universeSlug?: string;
};

export type JournalEntrySummary = {
  id: string;
  title: string;
  onda: JournalOnda;
  fechaRegistro: string;
  previewLines: string[];
  relativePath: string;
  day: number;
};

export type JournalEntryDetail = JournalEntrySummary & {
  body: string;
  responsable: string;
  campo: string;
  estado: string;
  baseWeight: number;
  metaTagsSecundarios: string[];
};

export function isJournalOnda(value: unknown): value is JournalOnda {
  return (
    typeof value === "string" &&
    JOURNAL_ONDAS.includes(value as JournalOnda)
  );
}
