import path from "node:path";

import { listProjects } from "@/lib/projects/service";
import { getCampoLabel } from "@/lib/projects/campos";
import { ingestDocumentSource, type SourceIngestSummary } from "@/lib/kg/sources/common";
import type { LlmEntity, LlmKgExtraction, LlmRelation } from "@/lib/kg/types";
import type { Project } from "@/lib/projects/types";

function buildStructuredExtraction(
  project: Project,
  documentPath: string,
): LlmKgExtraction {
  const entities: LlmEntity[] = [];
  const relations: LlmRelation[] = [];

  const projectName = project.title;
  entities.push({
    name: projectName,
    type: "proyecto",
    metadata: {
      projectId: project.id,
      campoSlug: project.campoSlug,
      estado: project.estado,
      prioridad: project.prioridad,
      impacto: project.impacto,
      avancePorcentaje: project.avancePorcentaje,
    },
    confidence: 0.95,
  });

  // El documento .md documenta el proyecto.
  relations.push({
    fromName: documentPath,
    toName: projectName,
    relationType: "documenta",
    context: `El archivo ${documentPath} documenta el proyecto ${projectName}.`,
    weight: 6,
    confidence: 0.95,
  });

  // Campo como concepto contenedor.
  const campoLabel = getCampoLabel(project.campoSlug);
  if (campoLabel) {
    entities.push({
      name: campoLabel,
      type: "concepto",
      metadata: { campoSlug: project.campoSlug, rol: "campo" },
      confidence: 0.9,
    });
    relations.push({
      fromName: projectName,
      toName: campoLabel,
      relationType: "pertenece_a",
      context: `El proyecto ${projectName} pertenece al campo ${campoLabel}.`,
      weight: 5,
      confidence: 0.9,
    });
  }

  // Responsable.
  if (project.responsable?.trim()) {
    entities.push({
      name: project.responsable.trim(),
      type: "persona",
      personaKind: "fisica",
      metadata: { rol: "responsable" },
      confidence: 0.9,
    });
    relations.push({
      fromName: project.responsable.trim(),
      toName: projectName,
      relationType: "responsable_de",
      context: `${project.responsable.trim()} es responsable del proyecto ${projectName}.`,
      weight: 8,
      confidence: 0.9,
    });
  }

  // Subpersonas a cargo.
  for (const persona of project.subpersonasCargo) {
    const name = persona.trim();
    if (!name) continue;
    entities.push({
      name,
      type: "persona",
      personaKind: "fisica",
      confidence: 0.85,
    });
    relations.push({
      fromName: name,
      toName: projectName,
      relationType: "participa_en",
      context: `${name} participa en el proyecto ${projectName}.`,
      weight: 6,
      confidence: 0.85,
    });
  }

  return { entities, relations };
}

function buildBody(project: Project): string {
  const parts = [project.description];
  if (project.resultadoFinal?.trim()) {
    parts.push(`Resultado final: ${project.resultadoFinal}`);
  }
  for (const entry of project.progressEntries) {
    parts.push(`Progreso (${entry.fecha}): ${entry.nota}`);
  }
  return parts.filter(Boolean).join("\n\n");
}

/** Ingesta un unico proyecto al grafo (usado por hooks y por el backfill). */
export async function ingestSingleProject(
  project: Project,
  options: { model?: string; force?: boolean } = {},
): Promise<SourceIngestSummary> {
  const relativePath = path
    .relative(process.cwd(), project.filePath)
    .split(path.sep)
    .join("/");

  const structured = buildStructuredExtraction(project, relativePath);
  const body = buildBody(project);

  const outcome = await ingestDocumentSource({
    sourceType: "project",
    sourceId: project.id,
    documentPath: relativePath,
    title: project.title,
    documentMeta: {
      projectId: project.id,
      campoSlug: project.campoSlug,
      estado: project.estado,
    },
    body,
    structured,
    sourceMetadata: { campoSlug: project.campoSlug, projectId: project.id },
    model: options.model,
    force: options.force,
  });

  return {
    sourceId: project.id,
    title: project.title,
    skipped: outcome.skipped,
    nodes: outcome.result?.nodeIds.length ?? 0,
    edges: outcome.result?.edgeIds.length ?? 0,
    mentions: outcome.result?.mentionIds.length ?? 0,
  };
}

/** Ingesta todos los proyectos del Atanor al grafo de conocimiento. */
export async function ingestProjects(options: {
  model?: string;
  force?: boolean;
} = {}): Promise<SourceIngestSummary[]> {
  const projects = await listProjects();
  const summaries: SourceIngestSummary[] = [];

  for (const project of projects) {
    summaries.push(await ingestSingleProject(project, options));
  }

  return summaries;
}
