import type { TableColumnKey } from "@/lib/ingesta/tablas/types";

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

const COLUMN_PATTERNS: Record<TableColumnKey, string[]> = {
  id: ["id", "codigo", "code", "ref", "referencia", "clave", "key", "uuid"],
  title: [
    "nombre",
    "titulo",
    "title",
    "name",
    "proyecto",
    "reto",
    "tarea",
    "proyecto reto ia",
    "proyecto / reto ia",
    "descripcion corta",
    "item",
  ],
  prioridad: [
    "prioridad",
    "priority",
    "peso",
    "urgencia",
    "gravedad",
    "prioridad 1 5",
    "prioridad 1-5",
  ],
  tags: ["tags", "etiquetas", "labels", "meta tags", "meta_tags", "keywords"],
  onda: [
    "onda",
    "clasificacion",
    "clasificacion area",
    "area",
    "categoria",
    "dominio",
    "taxonomia",
    "clasificacion / area",
  ],
  horasEstimadas: [
    "horas",
    "horas estimadas",
    "horas_estimadas",
    "estimated hours",
    "horas planificadas",
  ],
  horasRealizadas: [
    "horas realizadas",
    "horas_realizadas",
    "horas trabajadas",
    "actual hours",
  ],
  avancePorcentaje: [
    "avance",
    "progress",
    "avance porcentaje",
    "avance_porcentaje",
    "% avance",
    "porcentaje avance",
    "pct avance",
  ],
  estado: ["estado", "status", "fase", "situacion", "stage"],
  descripcion: [
    "descripcion",
    "description",
    "detalle",
    "notas",
    "observaciones",
    "contexto",
    "resumen",
  ],
  responsable: ["responsable", "owner", "asignado", "assignee", "jugador"],
  impacto: ["impacto", "impact", "impacto 1 5", "impacto 1-5"],
  dificultad: ["dificultad", "difficulty", "complejidad", "dificultad 1 5"],
  fechaInicio: [
    "fecha inicio",
    "fecha_inicio",
    "inicio",
    "start date",
    "created at",
    "fecha creacion",
  ],
  fechaObjetivo: [
    "fecha objetivo",
    "fecha_objetivo",
    "deadline",
    "fecha fin",
    "target date",
    "vencimiento",
  ],
};

function scoreHeaderMatch(normalizedHeader: string, patterns: string[]): number {
  let best = 0;

  for (const pattern of patterns) {
    if (normalizedHeader === pattern) {
      best = Math.max(best, 100);
      continue;
    }

    if (normalizedHeader.includes(pattern) || pattern.includes(normalizedHeader)) {
      best = Math.max(best, 70 + Math.min(pattern.length, normalizedHeader.length));
    }
  }

  return best;
}

export function mapTableColumns(
  headers: string[],
): Partial<Record<TableColumnKey, string>> {
  const mapping: Partial<Record<TableColumnKey, string>> = {};
  const usedHeaders = new Set<string>();

  const entries = (Object.entries(COLUMN_PATTERNS) as [TableColumnKey, string[]][]).sort(
    ([, patternsA], [, patternsB]) => {
      const maxA = Math.max(...patternsA.map((pattern) => pattern.length));
      const maxB = Math.max(...patternsB.map((pattern) => pattern.length));
      return maxB - maxA;
    },
  );

  for (const [columnKey, patterns] of entries) {
    let bestHeader: string | null = null;
    let bestScore = 0;

    for (const header of headers) {
      if (usedHeaders.has(header)) continue;

      const score = scoreHeaderMatch(normalizeHeader(header), patterns);
      if (score > bestScore) {
        bestScore = score;
        bestHeader = header;
      }
    }

    if (bestHeader && bestScore >= 70) {
      mapping[columnKey] = bestHeader;
      usedHeaders.add(bestHeader);
    }
  }

  return mapping;
}

export function getCellValue(
  row: Record<string, string>,
  mapping: Partial<Record<TableColumnKey, string>>,
  key: TableColumnKey,
): string {
  const header = mapping[key];
  if (!header) return "";
  return String(row[header] ?? "").trim();
}
