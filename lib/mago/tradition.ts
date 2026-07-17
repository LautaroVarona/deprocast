import type {
  ArcanaTradicion,
  TradicionDoble,
  TradicionMadre,
  TradicionSimple,
} from "@/lib/mago/types";

/** Las 3 Letras Madres — principios elementales y alquímicos. */
export const TRADICION_MADRES: Record<number, TradicionMadre> = {
  1: {
    alquimia: "Mercurio",
    metal: "Mercurio",
    genero: "—",
    atributoAlquimico: "Volatilidad",
  },
  13: {
    alquimia: "Azufre",
    metal: "Azufre",
    genero: "Masculino",
    atributoAlquimico: "Combustibilidad",
  },
  21: {
    alquimia: "Sal",
    metal: "Sal",
    genero: "Femenino",
    atributoAlquimico: "NO volatilidad / NO combustibilidad",
  },
};

/** Las 7 Letras Dobles — cosmología, chakras y V.I.T.R.I.O.L. */
export const TRADICION_DOBLES: Record<number, TradicionDoble> = {
  2: {
    sephirot: "Binah",
    hermetismo: "Mentalismo",
    chakra: "Muladhara",
    mantra: "LAM",
    elementoMetalPlaneta: "Tierra / Plomo / Saturno",
    cuerpoVitriol: "Ojo D / Visita",
    emocion: "Supervivencia / Paz con futuro",
    desbalance: "Miedo, codicia",
  },
  3: {
    sephirot: "Jesed",
    hermetismo: "Correspondencia",
    chakra: "Swadhisthana",
    mantra: "VAM",
    elementoMetalPlaneta: "Agua / Estaño / Júpiter",
    cuerpoVitriol: "Ojo I / Interiora",
    emocion: "Creatividad / Placer",
    desbalance: "Bajo libido",
  },
  4: {
    sephirot: "Gevurah",
    hermetismo: "Vibración",
    chakra: "Manipura",
    mantra: "RAM",
    elementoMetalPlaneta: "Fuego / Hierro / Marte",
    cuerpoVitriol: "Oído D / Terrae",
    emocion: "Sabiduría Absoluta / Voluntad",
    desbalance: "Baja autoestima",
  },
  11: {
    sephirot: "Tifereth",
    hermetismo: "Polaridad",
    chakra: "Anahata",
    mantra: "YAM",
    elementoMetalPlaneta: "Aire / Oro / Sol",
    cuerpoVitriol: "Oído I / Rectificando",
    emocion: "Regulación Emocional / Amor",
    desbalance: "Molestia",
  },
  17: {
    sephirot: "Netsaj",
    hermetismo: "Ritmo",
    chakra: "Vishuddha",
    mantra: "HAM",
    elementoMetalPlaneta: "Éter / Cobre / Venus",
    cuerpoVitriol: "Nariz D / Invenies",
    emocion: "Comunicación / Buena comunicación",
    desbalance: "Secretismo",
  },
  20: {
    sephirot: "Hod",
    hermetismo: "Causa y Efecto",
    chakra: "Ajna",
    mantra: "OM",
    elementoMetalPlaneta: "Luz / Mercurio / Mercurio",
    cuerpoVitriol: "Nariz I / Occultum",
    emocion: "Intuición / Empatía",
    desbalance: "Duda",
  },
  22: {
    sephirot: "Yesod",
    hermetismo: "Generación",
    chakra: "Sahasrara",
    mantra: "AUM",
    elementoMetalPlaneta: "Espacio / Plata / Luna",
    cuerpoVitriol: "Boca / Lapidem",
    emocion: "Consciencia",
    desbalance: "—",
  },
};

/** Las 12 Letras Simples — astrología, fisiología y Gran Obra alquímica. */
export const TRADICION_SIMPLES: Record<number, TradicionSimple> = {
  5: {
    astrologia: "Aries",
    accionFisiologica: "Habla",
    parteCuerpo: "Pie D",
    procesoQuimico: "Calcinación",
    etapaAlquimica: "Rubedo (Fénix, Fuego)",
  },
  6: {
    astrologia: "Tauro",
    accionFisiologica: "Pensamiento",
    parteCuerpo: "Riñón D",
    procesoQuimico: "Congelación",
    etapaAlquimica: "—",
  },
  7: {
    astrologia: "Géminis",
    accionFisiologica: "Movimiento",
    parteCuerpo: "Pie I",
    procesoQuimico: "Fijación",
    etapaAlquimica: "—",
  },
  8: {
    astrologia: "Cáncer",
    accionFisiologica: "Vista",
    parteCuerpo: "Mano D",
    procesoQuimico: "Disolución",
    etapaAlquimica: "Citrinitas (Águila, Agua)",
  },
  9: {
    astrologia: "Leo",
    accionFisiologica: "Oído",
    parteCuerpo: "Riñón I",
    procesoQuimico: "Digestión",
    etapaAlquimica: "—",
  },
  10: {
    astrologia: "Virgo",
    accionFisiologica: "Acción",
    parteCuerpo: "Mano I",
    procesoQuimico: "Destilación",
    etapaAlquimica: "—",
  },
  12: {
    astrologia: "Libra",
    accionFisiologica: "Coito",
    parteCuerpo: "Vesícula",
    procesoQuimico: "Sublimación",
    etapaAlquimica: "Albedo (Cisne, Aire)",
  },
  14: {
    astrologia: "Escorpio",
    accionFisiologica: "Olfato",
    parteCuerpo: "Intestino",
    procesoQuimico: "Filtración",
    etapaAlquimica: "—",
  },
  15: {
    astrologia: "Sagitario",
    accionFisiologica: "Sueño",
    parteCuerpo: "Esófago",
    procesoQuimico: "Ceración",
    etapaAlquimica: "—",
  },
  16: {
    astrologia: "Capricornio",
    accionFisiologica: "Ira",
    parteCuerpo: "Hígado",
    procesoQuimico: "Putrefacción",
    etapaAlquimica: "Nigredo (Cuervo, Tierra)",
  },
  18: {
    astrologia: "Acuario",
    accionFisiologica: "Gusto",
    parteCuerpo: "Estómago",
    procesoQuimico: "Multiplicación",
    etapaAlquimica: "—",
  },
  19: {
    astrologia: "Piscis",
    accionFisiologica: "Risa",
    parteCuerpo: "Bazo",
    procesoQuimico: "Proyección",
    etapaAlquimica: "—",
  },
};

export function getTradicionForArcana(
  id: number,
  tipo: "madre" | "doble" | "simple",
): ArcanaTradicion | undefined {
  if (tipo === "madre") {
    const madre = TRADICION_MADRES[id];
    return madre ? { tipo: "madre", madre } : undefined;
  }
  if (tipo === "doble") {
    const doble = TRADICION_DOBLES[id];
    return doble ? { tipo: "doble", doble } : undefined;
  }
  const simple = TRADICION_SIMPLES[id];
  return simple ? { tipo: "simple", simple } : undefined;
}

export type MagoLensId = "mago-22" | "mago-3" | "mago-7" | "mago-12";

export const MAGO_LENSES: {
  id: MagoLensId;
  label: string;
  subtitle: string;
  filter: "total" | "madre" | "doble" | "simple";
  href: string;
}[] = [
  {
    id: "mago-22",
    label: "Mago 22",
    subtitle: "Matriz completa · Aleph → Tav",
    filter: "total",
    href: "/ludus/mago",
  },
  {
    id: "mago-3",
    label: "Mago 3",
    subtitle: "Madres · Mercurio, Azufre, Sal",
    filter: "madre",
    href: "/ludus/mago/3",
  },
  {
    id: "mago-7",
    label: "Mago 7",
    subtitle: "Dobles · V.I.T.R.I.O.L.",
    filter: "doble",
    href: "/ludus/mago/7",
  },
  {
    id: "mago-12",
    label: "Mago 12",
    subtitle: "Simples · Gran Obra alquímica",
    filter: "simple",
    href: "/ludus/mago/12",
  },
];

export function getMagoLensByHref(pathname: string) {
  if (pathname.endsWith("/mago/3")) return MAGO_LENSES[1];
  if (pathname.endsWith("/mago/7")) return MAGO_LENSES[2];
  if (pathname.endsWith("/mago/12")) return MAGO_LENSES[3];
  return MAGO_LENSES[0];
}
