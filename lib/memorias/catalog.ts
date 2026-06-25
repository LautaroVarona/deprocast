/**
 * Catálogo de apartados de memoria (PGC / notas explicativas habituales en auditoría).
 * Los números son la clave primaria de segmentación — no se agrupa por palabras clave.
 */
export const MEMORIA_SECTION_CATALOG: Record<
  number,
  { canonicalTitle: string; aliases: string[] }
> = {
  7: {
    canonicalTitle: "Inmovilizado intangible",
    aliases: ["inmovilizado intangible", "intangibles"],
  },
  8: {
    canonicalTitle: "Arrendamientos",
    aliases: ["arrendamientos", "leasing"],
  },
  9: {
    canonicalTitle: "Inmovilizado material",
    aliases: ["inmovilizado material", "inmovilizado inmaterial"],
  },
  10: {
    canonicalTitle: "Inversiones inmobiliarias",
    aliases: ["inversiones inmobiliarias"],
  },
  11: {
    canonicalTitle: "Inmovilizado financiero",
    aliases: ["inmovilizado financiero", "instrumentos financieros a largo plazo"],
  },
  12: {
    canonicalTitle: "Situación fiscal",
    aliases: ["situacion fiscal", "impuesto sobre beneficios", "impuesto de sociedades"],
  },
  23: {
    canonicalTitle: "Operaciones con partes vinculadas",
    aliases: [
      "operaciones con partes vinculadas",
      "partes vinculadas",
      "transacciones con partes vinculadas",
    ],
  },
};

export const CRITICAL_TABLE_SECTIONS = [12, 23] as const;

export function getCanonicalSectionTitle(number: number, detectedTitle: string): string {
  const entry = MEMORIA_SECTION_CATALOG[number];
  if (!entry) return detectedTitle.trim();
  return entry.canonicalTitle;
}

export function normalizeMemoriaText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function titleMatchesSection(number: number, title: string): boolean {
  const entry = MEMORIA_SECTION_CATALOG[number];
  if (!entry) return true;
  const normalized = normalizeMemoriaText(title);
  if (normalizeMemoriaText(entry.canonicalTitle) === normalized) return true;
  return entry.aliases.some((alias) => normalized.includes(normalizeMemoriaText(alias)));
}
