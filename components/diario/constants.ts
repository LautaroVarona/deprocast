import type { JournalOnda } from "@/lib/journal/types";

export const JOURNAL_WAVE_TABS: {
  id: JournalOnda;
  label: string;
  icon: string;
  shortLabel: string;
  placeholder: string;
}[] = [
  {
    id: "DIARIO",
    label: "Diario General",
    icon: "📓",
    shortLabel: "Diario",
    placeholder:
      "¿Qué resonó hoy en el Observador? Pensamientos, micro-avances, fricciones, gratitud...",
  },
  {
    id: "SUEÑO_NOCTURNO",
    label: "Sueño Nocturno",
    icon: "🌙",
    shortLabel: "Sueño",
    placeholder:
      "¿Qué arquetipos, hexágonos o imágenes viste antes de despertar? No ignores los detalles...",
  },
  {
    id: "VISION_OBJETIVO",
    label: "Visión / Objetivo",
    icon: "🎯",
    shortLabel: "Visión",
    placeholder:
      "Describí la visión despierta: objetivos, hitos, escenarios futuros que querés materializar...",
  },
  {
    id: "MENTAL_DUMP",
    label: "Dump Mental",
    icon: "🧠",
    shortLabel: "Dump",
    placeholder:
      "Volcá todo sin filtro. Frases sueltas, ideas a medias, rabietas, loops mentales...",
  },
];

export const ONDA_BADGE_STYLES: Record<JournalOnda, string> = {
  DIARIO: "bg-muted text-muted-foreground",
  SUEÑO_NOCTURNO: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  VISION_OBJETIVO: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  MENTAL_DUMP: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

export function getOndaShortLabel(onda: JournalOnda): string {
  return (
    JOURNAL_WAVE_TABS.find((tab) => tab.id === onda)?.shortLabel ?? onda
  );
}
