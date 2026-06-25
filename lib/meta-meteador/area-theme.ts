import type { MetaArea } from "@/lib/meta-meteador/types";
import { META_AREAS } from "@/lib/meta-meteador/types";
import type { LucideIcon } from "lucide-react";
import {
  CpuIcon,
  GavelIcon,
  HeartPulseIcon,
  LandmarkIcon,
  PaletteIcon,
  UsersIcon,
} from "lucide-react";

export type AreaTheme = {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  chipClass: string;
};

export const AREA_THEMES: Record<MetaArea, AreaTheme> = {
  Salud: {
    label: "Salud",
    shortLabel: "Salud",
    icon: HeartPulseIcon,
    color: "#22c55e",
    bgClass: "bg-emerald-500/15",
    textClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-500/40",
    chipClass:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  },
  Legal: {
    label: "Legal",
    shortLabel: "Legal",
    icon: GavelIcon,
    color: "#6366f1",
    bgClass: "bg-indigo-500/15",
    textClass: "text-indigo-600 dark:text-indigo-400",
    borderClass: "border-indigo-500/40",
    chipClass:
      "bg-indigo-500/10 text-indigo-700 border-indigo-500/30 dark:text-indigo-300",
  },
  Finanzas: {
    label: "Finanzas",
    shortLabel: "Finanzas",
    icon: LandmarkIcon,
    color: "#eab308",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-500/40",
    chipClass:
      "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
  },
  Tecnologia: {
    label: "Tecnología",
    shortLabel: "Tech",
    icon: CpuIcon,
    color: "#0ea5e9",
    bgClass: "bg-sky-500/15",
    textClass: "text-sky-600 dark:text-sky-400",
    borderClass: "border-sky-500/40",
    chipClass:
      "bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-300",
  },
  Arte: {
    label: "Arte",
    shortLabel: "Arte",
    icon: PaletteIcon,
    color: "#ec4899",
    bgClass: "bg-pink-500/15",
    textClass: "text-pink-600 dark:text-pink-400",
    borderClass: "border-pink-500/40",
    chipClass:
      "bg-pink-500/10 text-pink-700 border-pink-500/30 dark:text-pink-300",
  },
  Comunidad: {
    label: "Comunidad",
    shortLabel: "Comunidad",
    icon: UsersIcon,
    color: "#a855f7",
    bgClass: "bg-violet-500/15",
    textClass: "text-violet-600 dark:text-violet-400",
    borderClass: "border-violet-500/40",
    chipClass:
      "bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-300",
  },
};

export const AREA_FILTER_THRESHOLD = 5;

export function getDominantAreas(
  areas: Record<MetaArea, { score_1_12: number; porcentaje: number }>,
  limit = 3,
): Array<{ area: MetaArea; score: number; porcentaje: number }> {
  return META_AREAS.map((area) => ({
    area,
    score: areas[area]?.score_1_12 ?? 0,
    porcentaje: areas[area]?.porcentaje ?? 0,
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function matchesAreaFilter(
  areas: Record<MetaArea, { score_1_12: number; porcentaje: number }>,
  area: MetaArea,
  threshold = AREA_FILTER_THRESHOLD,
): boolean {
  return (areas[area]?.score_1_12 ?? 0) > threshold;
}
