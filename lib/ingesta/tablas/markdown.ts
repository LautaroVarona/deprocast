import { MATERIA_PRIMA_ESTADO, type CampoSlug } from "@/lib/projects/campos";
import { getCampoLabel } from "@/lib/projects/paths";
import { clampScale } from "@/lib/projects/priority";
import { getCellValue } from "@/lib/ingesta/tablas/column-mapper";
import type { MappedTableRow, TableColumnKey } from "@/lib/ingesta/tablas/types";
import { randomUUID } from "node:crypto";

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function yamlArray(values: string[]): string {
  return JSON.stringify(values);
}

export function sanitizeProjectId(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return slug || randomUUID();
}

function parseNumericScale(value: string, fallback = 6): number {
  if (!value.trim()) return fallback;

  const percentMatch = value.match(/^(\d+(?:[.,]\d+)?)\s*%$/);
  if (percentMatch) {
    const pct = Number.parseFloat(percentMatch[1].replace(",", "."));
    if (Number.isFinite(pct)) {
      return clampScale(Math.round((pct / 100) * 12) || fallback);
    }
  }

  const numeric = Number.parseFloat(value.replace(",", ".").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) return fallback;

  if (numeric >= 0 && numeric <= 1) {
    return clampScale(Math.round(numeric * 12) || fallback);
  }

  if (numeric >= 0 && numeric <= 5) {
    return clampScale(Math.round((numeric / 5) * 12) || fallback);
  }

  return clampScale(numeric);
}

function parsePercent(value: string): number {
  if (!value.trim()) return 0;

  const cleaned = value.replace(",", ".").replace(/[^\d.-]/g, "");
  const numeric = Number.parseFloat(cleaned);
  if (!Number.isFinite(numeric)) return 0;

  if (value.includes("%") || numeric <= 100) {
    return Math.min(100, Math.max(0, Math.round(numeric)));
  }

  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function parseTags(value: string): string[] {
  if (!value.trim()) return [];

  return value
    .split(/[,;|/]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseHours(value: string): number {
  if (!value.trim()) return 0;
  const numeric = Number.parseFloat(value.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

export function buildTableProjectFilename(row: MappedTableRow): string {
  const idPart = sanitizeProjectId(row.id || row.title);
  return `${idPart}.md`;
}

export function buildTableProjectMarkdown(
  row: MappedTableRow,
  campoSlug: CampoSlug,
  options?: { isRawMatter?: boolean },
): string {
  const id = row.id ? sanitizeProjectId(row.id) : sanitizeProjectId(row.title);
  const campoLabel = getCampoLabel(campoSlug);
  const estado = options?.isRawMatter ? MATERIA_PRIMA_ESTADO : row.estado || "Idea";
  const importedAt = new Date().toISOString().slice(0, 10);

  const extraLines = Object.entries(row.extraFields)
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `- **${key}:** ${value.trim()}`);

  const bodySections: string[] = [];

  if (row.descripcion.trim()) {
    bodySections.push(row.descripcion.trim());
  }

  if (extraLines.length > 0) {
    bodySections.push("### Campos adicionales de la fila\n\n" + extraLines.join("\n"));
  }

  const body =
    bodySections.length > 0
      ? bodySections.join("\n\n")
      : "_Proyecto importado desde tabla estructurada sin descripción adicional._";

  return [
    "---",
    `id: ${yamlString(id)}`,
    `title: ${yamlString(row.title)}`,
    `campo: ${yamlString(campoLabel)}`,
    `meta_tags_secundarios: ${yamlArray(row.tags)}`,
    `description: ${yamlString(row.descripcion)}`,
    `responsable: ${yamlString(row.responsable)}`,
    `subpersonas_cargo: ${yamlArray([])}`,
    `fecha_inicio: ${yamlString(row.fechaInicio)}`,
    `fecha_objetivo: ${yamlString(row.fechaObjetivo)}`,
    `prioridad: ${clampScale(row.prioridad)}`,
    `impacto: ${clampScale(row.impacto)}`,
    `dificultad: ${clampScale(row.dificultad)}`,
    `horas_estimadas: ${row.horasEstimadas}`,
    `horas_realizadas: ${row.horasRealizadas}`,
    `avance_porcentaje: ${row.avancePorcentaje}`,
    `estado: ${yamlString(estado)}`,
    `resultado_final: ${yamlString("")}`,
    `onda: ${yamlString(row.onda || "sin-clasificar")}`,
    `source_type: "table_import"`,
    `imported_at: ${yamlString(importedAt)}`,
    `field: ${yamlString(campoSlug)}`,
    "---",
    "### Fechas de Acciones y Bitácora de Progreso:",
    `- [${importedAt}]: Proyecto estructurado desde ingesta de tablas.`,
    "",
    "### Contexto de la fila importada:",
    body,
    "",
  ].join("\n");
}

export function mapRecordToProjectRow(
  record: Record<string, string>,
  mapping: Partial<Record<TableColumnKey, string>>,
  mappedHeaders: Set<string>,
): MappedTableRow | null {
  const title = getCellValue(record, mapping, "title");
  const id = getCellValue(record, mapping, "id");

  if (!title && !id) {
    return null;
  }

  const extraFields: Record<string, string> = {};
  for (const [header, value] of Object.entries(record)) {
    if (!mappedHeaders.has(header) && value.trim()) {
      extraFields[header] = value.trim();
    }
  }

  return {
    id: id || sanitizeProjectId(title),
    title: title || id,
    prioridad: parseNumericScale(getCellValue(record, mapping, "prioridad")),
    impacto: parseNumericScale(getCellValue(record, mapping, "impacto")),
    dificultad: parseNumericScale(getCellValue(record, mapping, "dificultad")),
    tags: parseTags(getCellValue(record, mapping, "tags")),
    onda: getCellValue(record, mapping, "onda") || "sin-clasificar",
    horasEstimadas: parseHours(getCellValue(record, mapping, "horasEstimadas")),
    horasRealizadas: parseHours(getCellValue(record, mapping, "horasRealizadas")),
    avancePorcentaje: parsePercent(getCellValue(record, mapping, "avancePorcentaje")),
    estado: getCellValue(record, mapping, "estado") || "Idea",
    descripcion: getCellValue(record, mapping, "descripcion"),
    responsable: getCellValue(record, mapping, "responsable"),
    fechaInicio: getCellValue(record, mapping, "fechaInicio"),
    fechaObjetivo: getCellValue(record, mapping, "fechaObjetivo"),
    extraFields,
  };
}
