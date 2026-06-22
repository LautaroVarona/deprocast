import type { HealthPillar } from "@/lib/events/types";

export const HEALTH_PILLAR_TABS: Array<{
  id: HealthPillar;
  label: string;
  description: string;
}> = [
  {
    id: "rendimiento",
    label: "Rendimiento",
    description: "Bloques de entrenamiento y carga",
  },
  {
    id: "combustible",
    label: "Combustible",
    description: "Nutrición, ayuno y suplementación",
  },
  {
    id: "recuperacion",
    label: "Recuperación",
    description: "Sueño, HRV y estrés",
  },
  {
    id: "estado_base",
    label: "Estado Base",
    description: "Energía, foco y claridad",
  },
];
