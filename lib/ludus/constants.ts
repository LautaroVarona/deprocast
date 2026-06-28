import type { LudusArea } from "@/lib/ludus/types";

export const LUDUS_AREAS: LudusArea[] = [
  {
    id: "castillo",
    name: "Castillo",
    description:
      "Un lienzo futurista para clasificar y organizar todo el corpus con libertad absoluta.",
    href: "/ludus/castillo",
    available: true,
    accent: "amber",
    lore: "El nexo cognitivo convertido en espacio habitable.",
  },
  {
    id: "campamento",
    name: "Campamento",
    description:
      "Base de operaciones para Focus Work, microtareas y delegación al Avatar.",
    href: "/ludus/campamento",
    available: false,
    accent: "emerald",
    lore: "Donde Estudianta acumula Puntos de Señal — próximamente.",
  },
  {
    id: "trinchera",
    name: "Trinchera",
    description:
      "Zona de combate contra la fricción: retos laborales y bosses activos.",
    href: "/ludus/trinchera",
    available: false,
    accent: "rose",
    lore: "La Trituradora de Fricción aguarda — próximamente.",
  },
];
