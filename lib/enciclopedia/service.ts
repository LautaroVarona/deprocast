import "server-only";

import {
  FORCE_REGENERATE_REPORT_THRESHOLD,
  MAX_CONCEPT_LENGTH,
  MIN_CONCEPT_LENGTH,
} from "@/lib/enciclopedia/constants";
import { generateEncyclopediaEntry } from "@/lib/enciclopedia/generator";
import { conceptToSlug, normalizeConcept } from "@/lib/enciclopedia/slug";
import type {
  EncyclopediaEntryDto,
  EncyclopediaReportType,
  ExploreInput,
  ExploreResult,
  ReportInput,
  SessionEdge,
  SessionGraphSnapshot,
} from "@/lib/enciclopedia/types";
import { prisma } from "@/lib/prisma";
import type { EncyclopediaEntry, Prisma } from "@prisma/client";

function parseExplorableTerms(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function mapEntryToDto(
  entry: EncyclopediaEntry,
  fromCache = false,
): EncyclopediaEntryDto {
  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    body: entry.body,
    explorableTerms: parseExplorableTerms(entry.explorableTerms),
    parentEntryId: entry.parentEntryId,
    triggerTerm: entry.triggerTerm,
    model: entry.model,
    validatedCount: entry.validatedCount,
    reportCount: entry.reportCount,
    kgNodeId: entry.kgNodeId,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    fromCache,
  };
}

function shouldForceRegenerate(entry: EncyclopediaEntry): boolean {
  return (
    entry.reportCount > entry.validatedCount &&
    entry.reportCount >= FORCE_REGENERATE_REPORT_THRESHOLD
  );
}

export async function getEntryById(id: string): Promise<EncyclopediaEntryDto | null> {
  const entry = await prisma.encyclopediaEntry.findUnique({ where: { id } });
  return entry ? mapEntryToDto(entry, true) : null;
}

export async function getOrExploreConcept(
  input: ExploreInput,
): Promise<ExploreResult> {
  const concept = normalizeConcept(input.concept);
  if (concept.length < MIN_CONCEPT_LENGTH) {
    throw new Error("El concepto es demasiado corto.");
  }
  if (concept.length > MAX_CONCEPT_LENGTH) {
    throw new Error("El concepto es demasiado largo.");
  }

  const slug = conceptToSlug(concept);
  if (!slug) {
    throw new Error("No se pudo normalizar el concepto.");
  }

  let parentEntry: EncyclopediaEntry | null = null;
  if (input.parentEntryId) {
    parentEntry = await prisma.encyclopediaEntry.findUnique({
      where: { id: input.parentEntryId },
    });
    if (!parentEntry) {
      throw new Error("La entrada padre no existe.");
    }
  }

  const existing = await prisma.encyclopediaEntry.findUnique({ where: { slug } });
  if (existing && !input.forceRegenerate && !shouldForceRegenerate(existing)) {
    const edge = await ensureExplorationEdge({
      fromEntryId: input.parentEntryId,
      toEntryId: existing.id,
      triggerTerm: input.triggerTerm ?? concept,
    });

    return {
      entry: mapEntryToDto(existing, true),
      edge,
    };
  }

  const parentTitle = parentEntry?.title;
  const generated = await generateEncyclopediaEntry({
    concept,
    parentTitle,
    triggerTerm: input.triggerTerm,
  });

  const entry = existing
    ? await prisma.encyclopediaEntry.update({
        where: { id: existing.id },
        data: {
          title: generated.title,
          body: generated.body,
          explorableTerms: generated.explorableTerms,
          parentEntryId: input.parentEntryId ?? existing.parentEntryId,
          triggerTerm: input.triggerTerm ?? existing.triggerTerm,
          model: generated.model,
          reportCount: 0,
        },
      })
    : await prisma.encyclopediaEntry.create({
        data: {
          slug,
          title: generated.title,
          body: generated.body,
          explorableTerms: generated.explorableTerms,
          parentEntryId: input.parentEntryId ?? null,
          triggerTerm: input.triggerTerm ?? null,
          model: generated.model,
        },
      });

  const edge = await ensureExplorationEdge({
    fromEntryId: input.parentEntryId,
    toEntryId: entry.id,
    triggerTerm: input.triggerTerm ?? concept,
  });

  return {
    entry: mapEntryToDto(entry, false),
    edge,
  };
}

async function ensureExplorationEdge(input: {
  fromEntryId?: string;
  toEntryId: string;
  triggerTerm: string;
}): Promise<SessionEdge | null> {
  if (!input.fromEntryId) return null;

  const edge = await prisma.encyclopediaEdge.upsert({
    where: {
      fromEntryId_toEntryId_triggerTerm: {
        fromEntryId: input.fromEntryId,
        toEntryId: input.toEntryId,
        triggerTerm: input.triggerTerm,
      },
    },
    create: {
      fromEntryId: input.fromEntryId,
      toEntryId: input.toEntryId,
      triggerTerm: input.triggerTerm,
    },
    update: {},
  });

  return {
    id: edge.id,
    fromEntryId: edge.fromEntryId,
    toEntryId: edge.toEntryId,
    triggerTerm: edge.triggerTerm,
  };
}

export async function buildSessionGraph(
  entryIds: string[],
): Promise<SessionGraphSnapshot> {
  if (entryIds.length === 0) {
    return { nodes: [], edges: [] };
  }

  const uniqueIds = [...new Set(entryIds)];
  const entries = await prisma.encyclopediaEntry.findMany({
    where: { id: { in: uniqueIds } },
  });
  const entryMap = new Map(entries.map((e) => [e.id, e]));

  const dbEdges = await prisma.encyclopediaEdge.findMany({
    where: {
      fromEntryId: { in: uniqueIds },
      toEntryId: { in: uniqueIds },
    },
  });

  const degreeMap = new Map<string, number>();
  for (const edge of dbEdges) {
    degreeMap.set(edge.fromEntryId, (degreeMap.get(edge.fromEntryId) ?? 0) + 1);
    degreeMap.set(edge.toEntryId, (degreeMap.get(edge.toEntryId) ?? 0) + 1);
  }

  const nodes = uniqueIds
    .filter((id) => entryMap.has(id))
    .map((id) => {
      const entry = entryMap.get(id)!;
      return {
        id: entry.id,
        primaryName: entry.title,
        type: "concepto",
        degree: degreeMap.get(id) ?? 0,
      };
    });

  const edges = dbEdges.map((edge) => ({
    id: edge.id,
    source: edge.fromEntryId,
    target: edge.toEntryId,
    relationType: edge.triggerTerm,
    weight: null,
    confidence: 1,
  }));

  return { nodes, edges };
}

export async function submitReport(input: ReportInput): Promise<EncyclopediaEntryDto> {
  const entry = await prisma.encyclopediaEntry.findUnique({
    where: { id: input.entryId },
  });
  if (!entry) {
    throw new Error("Entrada no encontrada.");
  }

  const reportType = input.type as EncyclopediaReportType;

  await prisma.encyclopediaReport.create({
    data: {
      entryId: entry.id,
      type: reportType,
      comment: input.comment?.trim() || null,
      bodySnapshot: reportType !== "validate" ? entry.body : null,
    },
  });

  const updated = await prisma.encyclopediaEntry.update({
    where: { id: entry.id },
    data: {
      validatedCount:
        reportType === "validate"
          ? { increment: 1 }
          : entry.validatedCount,
      reportCount:
        reportType === "validate"
          ? entry.reportCount
          : { increment: 1 },
    },
  });

  return mapEntryToDto(updated, true);
}
