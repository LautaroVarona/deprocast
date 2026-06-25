import "server-only";

import type { CortexNode, CortexSnapshot, DocumentFormat } from "@/lib/cortex/types";
import { listDocumentMeta } from "@/lib/meta-meteador/store";
import {
  META_AREAS,
  type AreasRelevancia,
  type MetaArea,
} from "@/lib/meta-meteador/types";
import { findProjectById } from "@/lib/projects/service";
import { prisma } from "@/lib/prisma";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function inferDocumentFormat(
  materia: string,
  filename: string | null,
  onda: string,
): DocumentFormat {
  const haystack = `${materia} ${filename ?? ""} ${onda}`.toLowerCase();

  if (
    /audio|transcript|mp3|m4a|wav|ogg|voz|grabaci/.test(haystack)
  ) {
    return "audio";
  }

  if (/word|docx|doc|memoria|informe/.test(haystack)) {
    return "word";
  }

  if (
    /chat|texto|dump|gemini|gpt|conversaci|escrito|markdown|md/.test(haystack)
  ) {
    return "texto";
  }

  return "documento";
}

function aggregateSemanticBias(
  rows: Array<{ areas: AreasRelevancia }>,
): CortexSnapshot["semanticBias"] {
  if (rows.length === 0) {
    return META_AREAS.map((area) => ({
      area,
      score: 0,
      porcentaje: 0,
    }));
  }

  const totals = {} as Record<MetaArea, { sum: number; count: number }>;
  for (const area of META_AREAS) {
    totals[area] = { sum: 0, count: 0 };
  }

  for (const row of rows) {
    for (const area of META_AREAS) {
      const entry = row.areas[area];
      if (entry && entry.score_1_12 > 0) {
        totals[area].sum += entry.score_1_12;
        totals[area].count += 1;
      }
    }
  }

  return META_AREAS.map((area) => {
    const { sum, count } = totals[area];
    const score = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
    return {
      area,
      score,
      porcentaje: Math.round((score / 12) * 1000) / 10,
    };
  });
}

function resolveDominantArea(
  bias: CortexSnapshot["semanticBias"],
): MetaArea | null {
  const sorted = [...bias].sort((a, b) => b.score - a.score);
  if (!sorted[0] || sorted[0].score <= 0) return null;
  return sorted[0].area;
}

async function buildCortexNode(
  meta: Awaited<ReturnType<typeof listDocumentMeta>>[number],
): Promise<CortexNode> {
  const project = await findProjectById(meta.documentId);

  return {
    id: meta.documentId,
    titulo: meta.titulo,
    formato: inferDocumentFormat(
      meta.materia,
      project?.filename ?? null,
      meta.onda,
    ),
    materia: meta.materia,
    particula: meta.particula,
    campo: meta.campo,
    areas: meta.areas,
    processedAt: meta.processedAt.toISOString(),
    campoSlug: project?.campoSlug ?? null,
    projectTitle: project?.title ?? null,
  };
}

export async function getCortexSnapshot(): Promise<CortexSnapshot> {
  const since = new Date(Date.now() - WEEK_MS);

  const [totalNodesIndexed, allMeta, weekMeta] = await Promise.all([
    prisma.kgNode.count(),
    listDocumentMeta(),
    listDocumentMeta({ since }),
  ]);

  const semanticBias = aggregateSemanticBias(weekMeta);
  const nodes = await Promise.all(allMeta.map((meta) => buildCortexNode(meta)));

  return {
    totalNodesIndexed,
    validatedDocuments: allMeta.length,
    dominantAreaThisWeek: resolveDominantArea(semanticBias),
    semanticBias,
    nodes,
  };
}
