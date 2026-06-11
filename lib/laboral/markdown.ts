import { calculateBaseWeight } from "@/lib/laboral/base-weight";
import type { LaboralChallenge, LaboralChallengeRow } from "@/lib/laboral/types";

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function sanitizeFilenamePart(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return slug || "reto-sin-nombre";
}

export function buildChallengeFilename(row: LaboralChallengeRow): string {
  const idPart = sanitizeFilenamePart(row.id);
  const titlePart = sanitizeFilenamePart(row.title);
  return `${idPart}_${titlePart}.md`;
}

export function buildChallengeMarkdown(row: LaboralChallengeRow): string {
  const baseWeight = calculateBaseWeight(row.prioridad, row.impacto);

  const contextSections: string[] = [];

  if (row.observaciones.trim()) {
    contextSections.push(`**Observaciones (ventajas):**\n${row.observaciones.trim()}`);
  }

  if (row.puntosMejora.trim()) {
    contextSections.push(`**Puntos de mejora:**\n${row.puntosMejora.trim()}`);
  }

  const contextBody =
    contextSections.length > 0
      ? contextSections.join("\n\n")
      : "_Sin contexto histórico registrado._";

  return [
    "---",
    `id: ${yamlString(row.id)}`,
    `title: ${yamlString(row.title)}`,
    `source_type: "laboral_challenge"`,
    `onda: ${yamlString(row.onda)}`,
    `base_weight: ${baseWeight}`,
    `status: ${yamlString(row.estado)}`,
    `horas_estimadas: ${row.horasEstimadas ?? 0}`,
    `horas_realizadas: ${row.horasRealizadas ?? 0}`,
    `avance_porcentaje: ${row.avancePorcentaje ?? 0}`,
    `created_at: ${yamlString(row.createdAt)}`,
    `target_date: ${yamlString(row.targetDate)}`,
    `field: "laboral_varona"`,
    "---",
    "### Contexto de Desarrollo Recabado:",
    contextBody,
    "",
  ].join("\n");
}

type FrontmatterValue = string | number;

function parseFrontmatter(content: string): Record<string, FrontmatterValue> | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const result: Record<string, FrontmatterValue> = {};

  for (const line of match[1].split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1).trim();

    if (!key) continue;

    if (/^\d+$/.test(rawValue)) {
      result[key] = Number(rawValue);
    } else {
      try {
        result[key] = JSON.parse(rawValue) as string;
      } catch {
        result[key] = rawValue.replace(/^"|"$/g, "");
      }
    }
  }

  return result;
}

export function parseChallengeFile(
  filename: string,
  content: string,
): LaboralChallenge | null {
  const frontmatter = parseFrontmatter(content);
  if (!frontmatter) return null;

  const id = String(frontmatter.id ?? "");
  const title = String(frontmatter.title ?? "");
  const onda = String(frontmatter.onda ?? "SIN ÁREA");

  if (!title && !id) return null;

  const baseWeight =
    typeof frontmatter.base_weight === "number"
      ? frontmatter.base_weight
      : calculateBaseWeight(1, 1);

  return {
    id: id || filename.replace(/\.md$/, ""),
    title: title || id,
    onda,
    responsable: "",
    prioridad: 1,
    impacto: 1,
    dificultad: null,
    horasEstimadas:
      typeof frontmatter.horas_estimadas === "number"
        ? frontmatter.horas_estimadas
        : null,
    horasRealizadas:
      typeof frontmatter.horas_realizadas === "number"
        ? frontmatter.horas_realizadas
        : null,
    avancePorcentaje:
      typeof frontmatter.avance_porcentaje === "number"
        ? frontmatter.avance_porcentaje
        : null,
    estado: String(frontmatter.status ?? "Idea"),
    createdAt: String(frontmatter.created_at ?? ""),
    targetDate: String(frontmatter.target_date ?? ""),
    observaciones: "",
    puntosMejora: "",
    baseWeight,
    filename,
    field: "laboral_varona",
    sourceType: "laboral_challenge",
  };
}
