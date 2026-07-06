import type { AssaultBlockOption, LudusArea, LudusStatue } from "@/lib/ludus/types";

export const LUDUS_AREAS: LudusArea[] = [
  {
    id: "castillo",
    name: "Castillo",
    description:
      "Vista de pájaro — visión estratégica, KG y calibración del reino (Alpha).",
    href: "/ludus/castillo",
    available: true,
    accent: "amber",
    lore: "Centro de mando donde observás tus 5–6 frentes abiertos.",
    frequency: "Alpha",
    horizon: "Macro",
  },
  {
    id: "campamento",
    name: "Campamento",
    description:
      "Preparación meso — rutina semanal, energía y forjado de microtareas (Beta).",
    href: "/ludus/campamento",
    available: true,
    accent: "emerald",
    lore: "Traduce la estrategia del Castillo en táctica semanal.",
    frequency: "Beta",
    horizon: "Meso",
  },
  {
    id: "trinchera",
    name: "Trinchera",
    description:
      "Ejecución micro — bloques de foco extremo sin distracciones (Gamma).",
    href: "/ludus/trinchera",
    available: true,
    accent: "rose",
    lore: "El búnker: solo vos, la tarea y el tiempo.",
    frequency: "Gamma",
    horizon: "Micro",
  },
];

export const FOG_THRESHOLD_DAYS = 7;
export const FOG_LIGHT_DAYS = 5;

export const ASSAULT_BLOCK_OPTIONS: AssaultBlockOption[] = [
  { minutes: 15, label: "Sprint 15'" },
  { minutes: 25, label: "Pomodoro 25'" },
  { minutes: 45, label: "Ultradiano 45'" },
];

export const GAMMA_PRESET = {
  carrierHz: 200,
  beatHz: 40,
} as const;

export const LUDUS_STATUES: LudusStatue[] = [
  {
    id: "observador-amber",
    name: "Estatua del Observador",
    cost: 50,
    description: "Resplandor ámbar permanente en el lienzo del Castillo.",
  },
  {
    id: "sentinela-violet",
    name: "Sentinela Violeta",
    cost: 120,
    description: "Aura de vigilancia en las tarjetas del catálogo.",
  },
  {
    id: "tronos-estrategia",
    name: "Trono de Estrategia",
    cost: 250,
    description: "Marco dorado en la Calibración del Reino.",
  },
];
