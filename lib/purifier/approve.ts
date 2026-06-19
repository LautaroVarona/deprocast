import { ingestDocumentSource, type SourceIngestSummary } from "@/lib/kg/sources/common";
import { ingestKgExtraction } from "@/lib/kg/ingest";
import type { LlmEntity, LlmKgExtraction, LlmRelation } from "@/lib/kg/types";
import { prisma } from "@/lib/prisma";
import {
  deleteReviewRecord,
  loadReviewRecord,
} from "@/lib/purifier/engine";
import type { PurifierReviewRecord } from "@/lib/purifier/types";
import { getCampoLabel, resolveCampoSlug, type CampoSlug } from "@/lib/projects/campos";
import { getProjectDir } from "@/lib/projects/paths";
import { clampScale } from "@/lib/projects/priority";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type ApproveReviewInput = {
  reviewId: string;
  campoSlug: string;
  title: string;
  markdownBody: string;
  dimensions: {
    materia: string;
    particula: string;
    posicion: string;
    onda: string;
    tiempo: string;
    espacio: string;
    field: string;
    prioridad: number;
    impacto: number;
    dificultad: number;
  };
  metaTagsSecundarios: string[];
};

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function buildApprovedMarkdown(
  input: ApproveReviewInput,
  projectId: string,
  campoSlug: CampoSlug,
): string {
  const d = input.dimensions;
  const campoLabel = getCampoLabel(campoSlug);
  const description = input.markdownBody.trim().slice(0, 500);

  return [
    "---",
    `id: ${yamlString(projectId)}`,
    `title: ${yamlString(input.title)}`,
    `campo: ${yamlString(campoLabel)}`,
    `description: ${yamlString(description)}`,
    `materia: ${yamlString(d.materia)}`,
    `particula: ${yamlString(d.particula)}`,
    `posicion: ${yamlString(d.posicion)}`,
    `onda: ${yamlString(d.onda)}`,
    `tiempo: ${yamlString(d.tiempo)}`,
    `espacio: ${yamlString(d.espacio)}`,
    `field: ${yamlString(d.field)}`,
    `prioridad: ${clampScale(d.prioridad)}`,
    `impacto: ${clampScale(d.impacto)}`,
    `dificultad: ${clampScale(d.dificultad)}`,
    `meta_tags_secundarios: ${JSON.stringify(input.metaTagsSecundarios)}`,
    `estado: "coagulado"`,
    `approved_at: ${yamlString(new Date().toISOString())}`,
    "---",
  ].join("\n") + `\n\n# ${input.title}\n\n${input.markdownBody.trim()}\n`;
}

function buildApprovalStructured(
  input: ApproveReviewInput,
  projectId: string,
  campoSlug: CampoSlug,
  documentPath: string,
): LlmKgExtraction {
  const entities: LlmEntity[] = [];
  const relations: LlmRelation[] = [];
  const projectName = input.title.trim();

  entities.push({
    name: projectName,
    type: "proyecto",
    metadata: {
      projectId,
      campoSlug,
      estado: "coagulado",
      prioridad: clampScale(input.dimensions.prioridad),
      impacto: clampScale(input.dimensions.impacto),
      materia: input.dimensions.materia,
      onda: input.dimensions.onda,
    },
    confidence: 0.95,
  });

  relations.push({
    fromName: documentPath,
    toName: projectName,
    relationType: "documenta",
    context: `El archivo ${documentPath} documenta el proyecto ${projectName}.`,
    weight: 6,
    confidence: 0.95,
  });

  const campoLabel = getCampoLabel(campoSlug);
  entities.push({
    name: campoLabel,
    type: "concepto",
    metadata: { campoSlug, rol: "campo" },
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

  for (const tag of input.metaTagsSecundarios) {
    const name = tag.trim();
    if (!name) continue;
    entities.push({
      name,
      type: "concepto",
      metadata: { rol: "meta_tag" },
      confidence: 0.75,
    });
    relations.push({
      fromName: projectName,
      toName: name,
      relationType: "relacionado_con",
      context: `El proyecto ${projectName} está etiquetado con ${name}.`,
      weight: 3,
      confidence: 0.75,
    });
  }

  return { entities, relations };
}

function mergeExtractions(
  base: LlmKgExtraction,
  extra?: LlmKgExtraction,
): LlmKgExtraction {
  if (!extra) return base;

  return {
    entities: [...base.entities, ...extra.entities],
    relations: [...base.relations, ...extra.relations],
  };
}

async function ingestApprovedToKg(
  input: ApproveReviewInput,
  record: PurifierReviewRecord,
  relativePath: string,
  projectId: string,
  campoSlug: CampoSlug,
): Promise<SourceIngestSummary> {
  const structured = mergeExtractions(
    buildApprovalStructured(input, projectId, campoSlug, relativePath),
    record.kgExtraction,
  );

  const channel = record.source.metadata?.channel ?? undefined;

  const outcome = await ingestDocumentSource({
    sourceType: "project",
    sourceId: projectId,
    documentPath: relativePath,
    title: input.title,
    documentMeta: {
      projectId,
      campoSlug,
      estado: "coagulado",
      channel,
      assetId: record.assetId,
      reviewId: input.reviewId,
      materia: input.dimensions.materia,
      onda: input.dimensions.onda,
    },
    body: input.markdownBody.trim(),
    structured,
    sourceMetadata: {
      campoSlug,
      channel,
      assetId: record.assetId ?? undefined,
      reviewId: input.reviewId,
    },
    force: true,
  });

  return {
    sourceId: projectId,
    title: input.title,
    skipped: outcome.skipped,
    nodes: outcome.result?.nodeIds.length ?? 0,
    edges: outcome.result?.edgeIds.length ?? 0,
    mentions: outcome.result?.mentionIds.length ?? 0,
  };
}

async function persistFractalChunks(
  record: PurifierReviewRecord,
  transcriptId: string,
): Promise<{ id: string; content: string }[]> {
  await prisma.parentChunk.deleteMany({ where: { transcriptId } });

  const created: { id: string; content: string }[] = [];

  for (const parent of record.fractalSegments) {
    const content = parent.children.map((c) => c.content).join("\n\n");
    const parentChunk = await prisma.parentChunk.create({
      data: {
        transcriptId,
        content,
        startTimeMs: parent.index * 1000,
        endTimeMs: (parent.index + 1) * 1000,
        summary: parent.context,
      },
    });

    for (const child of parent.children) {
      await prisma.childChunk.create({
        data: {
          parentId: parentChunk.id,
          content: child.content,
        },
      });
    }

    created.push({ id: parentChunk.id, content });
  }

  return created;
}

async function ingestFractalChunksToKg(
  record: PurifierReviewRecord,
  chunks: { id: string; content: string }[],
  assetId?: string,
  reviewId?: string,
): Promise<void> {
  const extraction = record.kgExtraction;
  if (!extraction?.entities.length || chunks.length === 0) return;

  for (const chunk of chunks) {
    const contentLower = chunk.content.toLowerCase();
    const entities: LlmEntity[] = extraction.entities
      .filter((entity) => contentLower.includes(entity.name.toLowerCase()))
      .map((entity) => ({
        ...entity,
        mentions: [{ fragment: entity.name }],
      }));

    if (entities.length === 0) continue;

    await ingestKgExtraction({
      extraction: { entities, relations: [] },
      source: {
        type: "parent_chunk",
        id: chunk.id,
        metadata: { assetId, reviewId, source: "purifier_approve" },
        confidence: 0.75,
      },
    });
  }
}

export async function approveAndCoagulate(
  input: ApproveReviewInput,
): Promise<{ filePath: string; relativePath: string; kg: SourceIngestSummary }> {
  const loaded = await loadReviewRecord(input.reviewId);
  if (!loaded) {
    throw new Error("Registro de revisión no encontrado.");
  }

  const campoSlug = resolveCampoSlug(input.campoSlug);
  const targetDir = getProjectDir(campoSlug);
  await mkdir(targetDir, { recursive: true });

  const fileId = input.dimensions.particula || loaded.record.particula;
  const fileName = `${fileId}.md`;
  const filePath = path.join(targetDir, fileName);
  const relativePath = path.relative(process.cwd(), filePath).split(path.sep).join("/");

  const markdown = buildApprovedMarkdown(input, fileId, campoSlug);
  await writeFile(filePath, markdown, "utf-8");

  if (loaded.record.assetId) {
    const transcript = await prisma.transcript.findUnique({
      where: { assetId: loaded.record.assetId },
    });

    if (transcript) {
      const fractalChunks = await persistFractalChunks(loaded.record, transcript.id);
      await ingestFractalChunksToKg(
        loaded.record,
        fractalChunks,
        loaded.record.assetId ?? undefined,
        input.reviewId,
      );
    }
  }

  const kg = await ingestApprovedToKg(
    input,
    loaded.record,
    relativePath,
    fileId,
    campoSlug,
  );

  await deleteReviewRecord(input.reviewId);

  return {
    filePath,
    relativePath,
    kg,
  };
}
