import { prisma } from "@/lib/prisma";
import {
  deleteReviewRecord,
  loadReviewRecord,
} from "@/lib/purifier/engine";
import type { PurifierReviewRecord } from "@/lib/purifier/types";
import { getProjectDir } from "@/lib/projects/paths";
import { clampScale } from "@/lib/projects/priority";
import { resolveCampoSlug } from "@/lib/projects/campos";
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

function buildApprovedMarkdown(input: ApproveReviewInput): string {
  const d = input.dimensions;
  return [
    "---",
    `materia: ${yamlString(d.materia)}`,
    `particula: ${yamlString(d.particula)}`,
    `posicion: ${yamlString(d.posicion)}`,
    `onda: ${yamlString(d.onda)}`,
    `tiempo: ${yamlString(d.tiempo)}`,
    `espacio: ${yamlString(d.espacio)}`,
    `field: ${yamlString(d.field)}`,
    `title: ${yamlString(input.title)}`,
    `prioridad: ${clampScale(d.prioridad)}`,
    `impacto: ${clampScale(d.impacto)}`,
    `dificultad: ${clampScale(d.dificultad)}`,
    `meta_tags_secundarios: ${JSON.stringify(input.metaTagsSecundarios)}`,
    `estado: "coagulado"`,
    `approved_at: ${yamlString(new Date().toISOString())}`,
    "---",
  ].join("\n") + `\n\n# ${input.title}\n\n${input.markdownBody.trim()}\n`;
}

async function persistFractalChunks(
  record: PurifierReviewRecord,
  transcriptId: string,
): Promise<void> {
  await prisma.parentChunk.deleteMany({ where: { transcriptId } });

  for (const parent of record.fractalSegments) {
    const parentChunk = await prisma.parentChunk.create({
      data: {
        transcriptId,
        content: parent.children.map((c) => c.content).join("\n\n"),
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
  }
}

export async function approveAndCoagulate(
  input: ApproveReviewInput,
): Promise<{ filePath: string; relativePath: string }> {
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

  const markdown = buildApprovedMarkdown(input);
  await writeFile(filePath, markdown, "utf-8");

  if (loaded.record.assetId) {
    const transcript = await prisma.transcript.findUnique({
      where: { assetId: loaded.record.assetId },
    });

    if (transcript) {
      await persistFractalChunks(loaded.record, transcript.id);
    }
  }

  await deleteReviewRecord(input.reviewId);

  return {
    filePath,
    relativePath: path.relative(process.cwd(), filePath),
  };
}
