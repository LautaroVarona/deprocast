import {
  BABEL_CAMPO_LABEL,
  MATERIA_PRIMA_ESTADO,
} from "@/lib/projects/campos";
import {
  formatFechaRegistro,
  formatJournalTimestamp,
  formatShortTitleDate,
} from "@/lib/journal/paths";
import {
  isJournalOnda,
  type JournalEntryDetail,
  type JournalOnda,
} from "@/lib/journal/types";

const BODY_HEADER = "### 📝 Transcripción / Cuerpo del Registro:";
const DEFAULT_RESPONSABLE = "Operador";
const DEFAULT_FIELD = "cognitive-exo-cortex";
const DEFAULT_BASE_WEIGHT = 6;

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function yamlArray(values: string[]): string {
  return JSON.stringify(values);
}

export function buildJournalMarkdown(
  content: string,
  onda: JournalOnda,
  date = new Date(),
): { markdown: string; id: string; title: string; timestamp: string } {
  const timestamp = formatJournalTimestamp(date);
  const id = `journal-${timestamp}`;
  const title = `Registro Diario - ${formatShortTitleDate(date)}`;
  const fechaRegistro = formatFechaRegistro(date);

  const frontmatter = [
    "---",
    `id: ${yamlString(id)}`,
    `title: ${yamlString(title)}`,
    `campo: ${yamlString(BABEL_CAMPO_LABEL)}`,
    `onda: ${yamlString(onda)}`,
    `source_type: "personal_writing"`,
    `base_weight: ${DEFAULT_BASE_WEIGHT}`,
    `responsable: ${yamlString(DEFAULT_RESPONSABLE)}`,
    `fecha_registro: ${yamlString(fechaRegistro)}`,
    `estado: ${yamlString(MATERIA_PRIMA_ESTADO)}`,
    `field: ${yamlString(DEFAULT_FIELD)}`,
    `materia: "text/markdown"`,
    `meta_tags_secundarios: ${yamlArray([])}`,
    "---",
    BODY_HEADER,
    content.trim(),
    "",
  ].join("\n");

  return { markdown: frontmatter, id, title, timestamp };
}

function parseYamlValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    try {
      return JSON.parse(trimmed.replace(/^'/, '"').replace(/'$/, '"')) as string;
    } catch {
      return trimmed.replace(/^["']|["']$/g, "");
    }
  }
  return trimmed;
}

function parseYamlArray(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[")) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function parseFrontmatter(source: string): Record<string, string> {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    fields[key] = value;
  }
  return fields;
}

function extractBody(source: string): string {
  const withoutFrontmatter = source.replace(/^---[\s\S]*?---\r?\n?/, "");
  const bodyMatch = withoutFrontmatter.match(
    new RegExp(
      `${BODY_HEADER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*)`,
    ),
  );
  if (bodyMatch) return bodyMatch[1].trim();

  return withoutFrontmatter.trim();
}

function extractPreviewLines(body: string): string[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2);
}

function parseDayFromFechaRegistro(fechaRegistro: string): number {
  const match = fechaRegistro.match(/^\d{4}-\d{2}-(\d{2})/);
  return match ? Number.parseInt(match[1], 10) : 1;
}

export function parseJournalFile(
  source: string,
  relativePath: string,
): JournalEntryDetail | null {
  const fields = parseFrontmatter(source);
  const id = parseYamlValue(fields.id ?? "");
  const ondaRaw = parseYamlValue(fields.onda ?? "DIARIO");

  if (!id || !isJournalOnda(ondaRaw)) return null;

  const body = extractBody(source);
  const fechaRegistro = parseYamlValue(fields.fecha_registro ?? "");

  return {
    id,
    title: parseYamlValue(fields.title ?? "Sin título"),
    onda: ondaRaw,
    fechaRegistro,
    previewLines: extractPreviewLines(body),
    relativePath,
    day: parseDayFromFechaRegistro(fechaRegistro),
    body,
    responsable: parseYamlValue(fields.responsable ?? ""),
    campo: parseYamlValue(fields.campo ?? ""),
    estado: parseYamlValue(fields.estado ?? ""),
    baseWeight: Number.parseInt(fields.base_weight ?? "6", 10) || 6,
    metaTagsSecundarios: parseYamlArray(fields.meta_tags_secundarios ?? "[]"),
  };
}
