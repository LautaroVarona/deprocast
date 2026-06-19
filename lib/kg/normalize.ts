import type { NodeType } from "@/lib/kg/types";
import { isNodeType } from "@/lib/kg/types";

/** Mapeo de tipos del mock processor / modelo Entity legacy → NODE_TYPES. */
const LEGACY_ENTITY_TYPE_MAP: Record<string, NodeType> = {
  project: "proyecto",
  proyecto: "proyecto",
  technology: "tecnologia",
  tecnologia: "tecnologia",
  person: "persona",
  persona: "persona",
  organization: "organizacion",
  organizacion: "organizacion",
  place: "lugar",
  lugar: "lugar",
  idea: "idea",
  law: "ley",
  ley: "ley",
  process: "proceso",
  proceso: "proceso",
  concept: "concepto",
  concepto: "concepto",
  document: "documento",
  documento: "documento",
  file: "archivo",
  archivo: "archivo",
  module: "modulo",
  modulo: "modulo",
};

/**
 * Convierte un tipo de entidad legacy (p. ej. "Project", "Technology") al
 * vocabulario canónico del grafo (NODE_TYPES).
 */
export function mapLegacyEntityType(legacyType: string): NodeType {
  const key = legacyType.trim().toLowerCase();
  if (isNodeType(key)) return key;
  return LEGACY_ENTITY_TYPE_MAP[key] ?? "concepto";
}

export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  const distance = matrix[a.length][b.length];
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

const FUZZY_THRESHOLD = 0.85;

export function namesMatchFuzzy(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return levenshteinRatio(na, nb) >= FUZZY_THRESHOLD;
}

export function parseAliasesJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function parseMetadataJson(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}
