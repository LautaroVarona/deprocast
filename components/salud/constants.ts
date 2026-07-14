import type { SaludTab } from "@/components/salud/types";

export const SALUD_TABS: Array<{
  id: SaludTab;
  label: string;
  emoji: string;
  description: string;
}> = [
  {
    id: "telemetria",
    label: "Telemetría",
    emoji: "📊",
    description: "Sensores biológicos, sueño, HRV y pasos.",
  },
  {
    id: "alimentacion",
    label: "Alimentación",
    emoji: "🥑",
    description: "Ingestas, ayuno intermitente y combustible.",
  },
  {
    id: "deporte",
    label: "Deporte",
    emoji: "🏃",
    description: "Actividad física, duración e intensidad.",
  },
  {
    id: "mas",
    label: "Más",
    emoji: "➕",
    description: "Métricas de entorno y bienestar extendido.",
  },
];

export const TELEMETRIA_PLACEHOLDER = {
  title: "En construcción",
  subtitle:
    "Próximamente: Integración de APIs y sensores biológicos (sueño, HRV, pasos).",
} as const;

export const MAS_PLACEHOLDER = {
  title: "En construcción",
  subtitle:
    "Espacio reservado para futuras métricas de entorno (exposición solar, calidad del aire, meditación).",
} as const;

export const ACTIVITY_METRIC_OPTIONS = [
  { value: "duration_min" as const, label: "Duración (minutos)" },
  { value: "distance_km" as const, label: "Distancia (km)" },
  { value: "intensity" as const, label: "Intensidad (1–10)" },
] as const;
