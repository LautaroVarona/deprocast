import type { ArcanaCore } from "@/lib/mago/types";

export const CORE_ARCANA_22: ArcanaCore[] = [
  { id: 1, letra: "Aleph", significado: "Buey / Líder", tarot: "Mago", tipo: "madre" },
  { id: 2, letra: "Beth", significado: "Cosa", tarot: "Papisa", tipo: "doble" },
  { id: 3, letra: "Gimel", significado: "Camello", tarot: "Emperatriz", tipo: "doble" },
  { id: 4, letra: "Daleth", significado: "Puerta", tarot: "Emperador", tipo: "doble" },
  { id: 5, letra: "He", significado: "Ventana / Aliento", tarot: "Papa", tipo: "simple" },
  { id: 6, letra: "Vav", significado: "Clavo / Gancho", tarot: "Enamorado", tipo: "simple" },
  { id: 7, letra: "Zayin", significado: "Espada / Arma", tarot: "Carro", tipo: "simple" },
  { id: 8, letra: "Cheth", significado: "Valla / Cercado", tarot: "Justicia", tipo: "simple" },
  { id: 9, letra: "Teth", significado: "Serpiente / Escudo", tarot: "Ermitaño", tipo: "simple" },
  { id: 10, letra: "Yod", significado: "Mano", tarot: "Rueda de la Fortuna", tipo: "simple" },
  { id: 11, letra: "Kaph", significado: "Palma de la mano", tarot: "Fuerza", tipo: "doble" },
  { id: 12, letra: "Lamed", significado: "Aguijón / Guía", tarot: "Colgado", tipo: "simple" },
  { id: 13, letra: "Mem", significado: "Agua", tarot: "Muerte", tipo: "madre" },
  { id: 14, letra: "Nun", significado: "Red", tarot: "Templanza", tipo: "simple" },
  { id: 15, letra: "Samekh", significado: "Apoyo / Puntal", tarot: "Diablo", tipo: "simple" },
  { id: 16, letra: "Ayin", significado: "Ojo", tarot: "Torre", tipo: "simple" },
  { id: 17, letra: "Pe", significado: "Boca", tarot: "Estrella", tipo: "doble" },
  { id: 18, letra: "Tzaddi", significado: "Anzuelo / Cazar", tarot: "Luna", tipo: "simple" },
  { id: 19, letra: "Qoph", significado: "Nuca", tarot: "Sol", tipo: "simple" },
  { id: 20, letra: "Resh", significado: "Cabeza", tarot: "Juicio", tipo: "doble" },
  { id: 21, letra: "Shin", significado: "Diente / Fuego", tarot: "Mundo / Loco", tipo: "madre" },
  { id: 22, letra: "Tav", significado: "Cruz + Marca", tarot: "Loco / Mundo", tipo: "doble" },
];

export const MAGO_SLOT_COUNT = 22;

export const MAGO_FILTER_LABELS = {
  total: "Total",
  madre: "3 Madres",
  doble: "7 Dobles",
  simple: "12 Simples",
} as const;
