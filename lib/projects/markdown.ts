import { getCampoLabel, getCampoSlugFromLabel } from "@/lib/projects/paths";
import { clampScale } from "@/lib/projects/priority";
import {
  PROJECT_STATUSES,
  PROJECT_TIPOS,
  type CreateProjectInput,
  type ProgressEntry,
  type Project,
  type ProjectStatus,
  type ProjectTipo,
} from "@/lib/projects/types";
import type { CampoSlug } from "@/lib/projects/campos";
import path from "node:path";

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function yamlArray(values: string[]): string {
  return JSON.stringify(values);
}

function formatDateForEntry(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function buildInitialProgressEntry(nota: string, date = new Date()): ProgressEntry {
  return {
    fecha: formatDateForEntry(date),
    nota: nota.trim(),
  };
}

export function buildProjectMarkdown(
  project: Omit<Project, "filename" | "filePath" | "progressEntries"> & {
    progressEntries: ProgressEntry[];
  },
): string {
  const progressLines =
    project.progressEntries.length > 0
      ? project.progressEntries.map(
          (entry) => `- [${entry.fecha}]: ${entry.nota}`,
        )
      : [`- [${formatDateForEntry()}]: Creación del proyecto. Inicialización del contexto en el Atanor local.`];

  return [
    "---",
    `id: ${yamlString(project.id)}`,
    `title: ${yamlString(project.title)}`,
    ...(project.tipo ? [`tipo: ${yamlString(project.tipo)}`] : []),
    `campo: ${yamlString(project.campo)}`,
    `meta_tags_secundarios: ${yamlArray(project.metaTagsSecundarios)}`,
    `description: ${yamlString(project.description)}`,
    `responsable: ${yamlString(project.responsable)}`,
    `subpersonas_cargo: ${yamlArray(project.subpersonasCargo)}`,
    `fecha_inicio: ${yamlString(project.fechaInicio)}`,
    `fecha_objetivo: ${yamlString(project.fechaObjetivo)}`,
    `prioridad: ${clampScale(project.prioridad)}`,
    `impacto: ${clampScale(project.impacto)}`,
    `dificultad: ${clampScale(project.dificultad)}`,
    `horas_estimadas: ${project.horasEstimadas}`,
    `horas_realizadas: ${project.horasRealizadas}`,
    `avance_porcentaje: ${project.avancePorcentaje}`,
    `estado: ${yamlString(project.estado)}`,
    `resultado_final: ${yamlString(project.resultadoFinal)}`,
    "---",
    "### Fechas de Acciones y Bitácora de Progreso:",
    ...progressLines,
    "",
  ].join("\n");
}

export function createProjectFromInput(
  input: CreateProjectInput,
  id: string,
  campoLabel?: string,
): Omit<Project, "filename" | "filePath"> {
  const campo = campoLabel ?? getCampoLabel(input.campoSlug);
  const initialNote =
    input.notasIniciales?.trim() ||
    "Creación del proyecto. Inicialización del contexto en el Atanor local.";

  return {
    id,
    title: input.title.trim(),
    tipo: input.tipo ?? null,
    campo,
    campoSlug: input.campoSlug,
    metaTagsSecundarios: input.metaTagsSecundarios,
    description: input.description.trim(),
    responsable: input.responsable.trim(),
    subpersonasCargo: input.subpersonasCargo.filter(Boolean),
    fechaInicio: input.fechaInicio,
    fechaObjetivo: input.fechaObjetivo,
    prioridad: clampScale(input.prioridad),
    impacto: clampScale(input.impacto),
    dificultad: clampScale(input.dificultad),
    horasEstimadas: input.horasEstimadas,
    horasRealizadas: input.horasRealizadas,
    avancePorcentaje: Math.min(100, Math.max(0, input.avancePorcentaje)),
    estado: input.estado,
    resultadoFinal: input.resultadoFinal.trim(),
    progressEntries: [buildInitialProgressEntry(initialNote)],
  };
}

type FrontmatterValue = string | number | string[];

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
      continue;
    }

    if (rawValue.startsWith("[")) {
      try {
        const parsed = JSON.parse(rawValue) as unknown;
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
          result[key] = parsed;
        }
      } catch {
        result[key] = [];
      }
      continue;
    }

    try {
      result[key] = JSON.parse(rawValue) as string;
    } catch {
      result[key] = rawValue.replace(/^"|"$/g, "");
    }
  }

  return result;
}

function parseProgressEntries(body: string): ProgressEntry[] {
  const sectionMatch = body.match(
    /### Fechas de Acciones y Bitácora de Progreso:\s*\n([\s\S]*?)(?:\n### |\s*$)/,
  );
  if (!sectionMatch) return [];

  const entries: ProgressEntry[] = [];
  const linePattern = /^-\s*\[([^\]]+)\]:\s*(.+)$/;

  for (const line of sectionMatch[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("-")) continue;

    const match = trimmed.match(linePattern);
    if (!match) continue;

    entries.push({
      fecha: match[1].trim(),
      nota: match[2].trim(),
    });
  }

  return entries;
}

const MIN_DEFAULT_SCALE = 6;

function resolveCampoSlug(
  frontmatter: Record<string, FrontmatterValue>,
  filePath: string,
): CampoSlug {
  const fromDir = path.basename(path.dirname(filePath));
  const campoLabel = String(frontmatter.campo ?? "");
  const fromLabel = getCampoSlugFromLabel(campoLabel);

  if (fromLabel) return fromLabel;
  return fromDir;
}

function parseProjectTipo(value: unknown): ProjectTipo | null {
  const tipo = String(value ?? "");
  return PROJECT_TIPOS.includes(tipo as ProjectTipo) ? (tipo as ProjectTipo) : null;
}

function parseStatus(value: unknown): ProjectStatus {
  const estado = String(value ?? "Idea");
  return PROJECT_STATUSES.includes(estado as ProjectStatus)
    ? (estado as ProjectStatus)
    : "Idea";
}

export function parseProjectFile(filePath: string, content: string): Project | null {
  const frontmatter = parseFrontmatter(content);
  if (!frontmatter) return null;

  const id = String(frontmatter.id ?? "");
  const title = String(frontmatter.title ?? "");
  if (!id && !title) return null;

  const bodyMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  const body = bodyMatch?.[1] ?? "";
  const progressEntries = parseProgressEntries(body);
  const campoSlug = resolveCampoSlug(frontmatter, filePath);

  return {
    id: id || path.basename(filePath, ".md"),
    title: title || id,
    tipo: parseProjectTipo(frontmatter.tipo),
    campo: String(frontmatter.campo ?? getCampoLabel(campoSlug)),
    campoSlug,
    metaTagsSecundarios: Array.isArray(frontmatter.meta_tags_secundarios)
      ? frontmatter.meta_tags_secundarios
      : [],
    description: String(frontmatter.description ?? ""),
    responsable: String(frontmatter.responsable ?? ""),
    subpersonasCargo: Array.isArray(frontmatter.subpersonas_cargo)
      ? frontmatter.subpersonas_cargo
      : [],
    fechaInicio: String(frontmatter.fecha_inicio ?? ""),
    fechaObjetivo: String(frontmatter.fecha_objetivo ?? ""),
    prioridad:
      typeof frontmatter.prioridad === "number"
        ? clampScale(frontmatter.prioridad)
        : MIN_DEFAULT_SCALE,
    impacto:
      typeof frontmatter.impacto === "number"
        ? clampScale(frontmatter.impacto)
        : MIN_DEFAULT_SCALE,
    dificultad:
      typeof frontmatter.dificultad === "number"
        ? clampScale(frontmatter.dificultad)
        : MIN_DEFAULT_SCALE,
    horasEstimadas:
      typeof frontmatter.horas_estimadas === "number"
        ? frontmatter.horas_estimadas
        : 0,
    horasRealizadas:
      typeof frontmatter.horas_realizadas === "number"
        ? frontmatter.horas_realizadas
        : 0,
    avancePorcentaje:
      typeof frontmatter.avance_porcentaje === "number"
        ? frontmatter.avance_porcentaje
        : 0,
    estado: parseStatus(frontmatter.estado),
    resultadoFinal: String(frontmatter.resultado_final ?? ""),
    progressEntries,
    filename: path.basename(filePath),
    filePath,
  };
}

export function updateCampoInMarkdown(content: string, campoLabel: string): string {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!frontmatterMatch) return content;

  const [, frontmatterBlock, body] = frontmatterMatch;
  const updatedBlock = frontmatterBlock.replace(
    /^campo:\s*.+$/m,
    `campo: ${yamlString(campoLabel)}`,
  );

  return `---\n${updatedBlock}\n---\n${body}`;
}

export function updateTitleInMarkdown(content: string, title: string): string {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!frontmatterMatch) return content;

  const [, frontmatterBlock, body] = frontmatterMatch;
  const updatedBlock = frontmatterBlock.replace(
    /^title:\s*.+$/m,
    `title: ${yamlString(title.trim())}`,
  );

  return `---\n${updatedBlock}\n---\n${body}`;
}

export function appendProgressToMarkdown(
  content: string,
  entry: ProgressEntry,
): string {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!frontmatterMatch) return content;

  const [, frontmatterBlock, body] = frontmatterMatch;
  const newLine = `- [${entry.fecha}]: ${entry.nota}`;

  if (body.includes("### Fechas de Acciones y Bitácora de Progreso:")) {
    const updatedBody = body.replace(
      /(### Fechas de Acciones y Bitácora de Progreso:\s*\n)/,
      `$1${newLine}\n`,
    );
    return `---\n${frontmatterBlock}\n---\n${updatedBody}`;
  }

  return [
    "---",
    frontmatterBlock,
    "---",
    "### Fechas de Acciones y Bitácora de Progreso:",
    newLine,
    body.trim(),
    "",
  ].join("\n");
}

export function extractMarkdownBody(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return match?.[1]?.trim() ?? "";
}
