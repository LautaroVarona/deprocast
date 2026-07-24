import "server-only";

import { shouldFilterByUniverse } from "@/lib/babel/context-seal";
import { parseArchivoId } from "@/lib/archivo/types";
import { listProjectionsForTarget } from "@/lib/babel/projection-store";
import { resolveUniverseDocumentIds } from "@/lib/babel/universe-documents";
import { listDocumentMeta } from "@/lib/meta-meteador/store";
import { buildProjectIndex, listCampos } from "@/lib/projects/service";
import type { Project } from "@/lib/projects/types";
import { prisma } from "@/lib/prisma";

/** null = sin filtro (universo Babel); Set vacío = universo sin datos. */
export type UniverseIdFilter = Set<string> | null;

export function shouldApplyUniverseFilter(universeSlug?: string): boolean {
  return Boolean(universeSlug && shouldFilterByUniverse(universeSlug));
}

export async function resolveUniverseAudioAssetIds(
  universeSlug: string,
): Promise<UniverseIdFilter> {
  if (!shouldFilterByUniverse(universeSlug)) {
    return null;
  }

  const [audioRecords, projections] = await Promise.all([
    prisma.babelRecord.findMany({
      where: { contextSeal: universeSlug, kind: "audio" },
      select: { physicalRef: true },
    }),
    listProjectionsForTarget(universeSlug),
  ]);

  const ids = new Set<string>();
  for (const row of audioRecords) {
    ids.add(row.physicalRef);
  }
  for (const row of projections) {
    if (row.kind === "audio") {
      ids.add(row.physicalRef);
    }
  }

  return ids;
}

export async function resolveUniverseKgSourceIds(
  universeSlug: string,
): Promise<Set<string>> {
  const projectIndex = await buildProjectIndex();
  const allMeta = await listDocumentMeta();
  const documentIds = await resolveUniverseDocumentIds({
    universeSlug,
    documentIds: allMeta.map((row) => row.documentId),
    projectIndex,
  });

  const audioIds = await resolveUniverseAudioAssetIds(universeSlug);
  const [babelRefs, projections] = await Promise.all([
    prisma.babelRecord.findMany({
      where: { contextSeal: universeSlug },
      select: { physicalRef: true },
    }),
    listProjectionsForTarget(universeSlug),
  ]);

  const sourceIds = new Set<string>([
    ...documentIds,
    ...(audioIds ?? []),
    ...babelRefs.map((row) => row.physicalRef),
    ...projections.map((row) => row.physicalRef),
  ]);

  return sourceIds;
}

export async function resolveUniverseKgNodeIds(
  universeSlug: string,
): Promise<UniverseIdFilter> {
  if (!shouldFilterByUniverse(universeSlug)) {
    return null;
  }

  const ids = new Set<string>();

  const sourceIds = await resolveUniverseKgSourceIds(universeSlug);
  if (sourceIds.size > 0) {
    const groups = await prisma.kgMention.groupBy({
      by: ["nodeId"],
      where: { sourceId: { in: [...sourceIds] } },
    });
    for (const group of groups) {
      ids.add(group.nodeId);
    }
  }

  // Sellos CRM explícitos (alta manual / promote sin mención de fuente).
  const sealed = await prisma.babelRecord.findMany({
    where: { contextSeal: universeSlug, kind: "kg_node" },
    select: { physicalRef: true },
  });
  for (const row of sealed) {
    ids.add(row.physicalRef);
  }

  return ids;
}

export async function filterReviewRecordsForUniverse<
  T extends { reviewId: string; assetId?: string },
>(records: T[], universeSlug?: string): Promise<T[]> {
  if (!universeSlug || !shouldFilterByUniverse(universeSlug)) {
    return records;
  }

  const [audioIds, babelRefs, projections] = await Promise.all([
    resolveUniverseAudioAssetIds(universeSlug),
    prisma.babelRecord.findMany({
      where: { contextSeal: universeSlug },
      select: { physicalRef: true },
    }),
    listProjectionsForTarget(universeSlug),
  ]);

  const ownedRefs = new Set([
    ...babelRefs.map((row) => row.physicalRef),
    ...projections.map((row) => row.physicalRef),
  ]);

  return records.filter((record) => {
    if (record.assetId && audioIds?.has(record.assetId)) {
      return true;
    }
    return ownedRefs.has(record.reviewId);
  });
}

export async function resolveUniverseJournalPaths(
  universeSlug: string,
): Promise<Set<string>> {
  if (!shouldFilterByUniverse(universeSlug)) {
    return new Set();
  }

  const [owned, projections] = await Promise.all([
    prisma.babelRecord.findMany({
      where: { contextSeal: universeSlug, kind: "journal" },
      select: { physicalRef: true },
    }),
    listProjectionsForTarget(universeSlug),
  ]);

  const paths = new Set<string>();
  for (const row of owned) paths.add(row.physicalRef);
  for (const row of projections) {
    if (row.kind === "journal") paths.add(row.physicalRef);
  }
  return paths;
}

export async function filterProjectsForUniverse(
  projects: Project[],
  universeSlug?: string,
): Promise<Project[]> {
  if (!universeSlug || !shouldFilterByUniverse(universeSlug)) {
    return projects;
  }

  const projectIndex = await buildProjectIndex();
  const allMeta = await listDocumentMeta();
  const documentIds = await resolveUniverseDocumentIds({
    universeSlug,
    documentIds: allMeta.map((row) => row.documentId),
    projectIndex,
  });

  const campos = await listCampos(universeSlug);
  const campoSlugs = new Set(campos.map((campo) => campo.slug));

  return projects.filter(
    (project) =>
      documentIds.has(project.id) ||
      (project.campoSlug && campoSlugs.has(project.campoSlug)),
  );
}

export async function filterArchivoItemsForUniverse<
  T extends { id: string },
>(items: T[], universeSlug?: string): Promise<T[]> {
  if (!universeSlug || !shouldFilterByUniverse(universeSlug)) {
    return items;
  }

  const sourceIds = await resolveUniverseKgSourceIds(universeSlug);
  if (sourceIds.size === 0) return [];

  return items.filter((item) => {
    const parsed = parseArchivoId(item.id);
    if (!parsed) return false;
    if (sourceIds.has(parsed.sourceId)) return true;
    return [...sourceIds].some(
      (ref) => parsed.sourceId.includes(ref) || ref.includes(parsed.sourceId),
    );
  });
}

export async function filterActivityEntriesForUniverse<
  T extends {
    sourceRef: string | null;
    correlationId: string | null;
    sourceType?: string | null;
    category?: string | null;
  },
>(entries: T[], universeSlug?: string): Promise<T[]> {
  if (!universeSlug || !shouldFilterByUniverse(universeSlug)) {
    return entries;
  }

  const sourceIds = await resolveUniverseKgSourceIds(universeSlug);
  if (sourceIds.size === 0) {
    return entries.filter((entry) => isGlobalHealthActivityEntry(entry));
  }

  return entries.filter((entry) => {
    if (isGlobalHealthActivityEntry(entry)) return true;
    if (entry.sourceRef && sourceIds.has(entry.sourceRef)) return true;
    if (entry.correlationId && sourceIds.has(entry.correlationId)) return true;
    return false;
  });
}

const HEALTH_PILLARS = new Set([
  "rendimiento",
  "combustible",
  "recuperacion",
  "estado_base",
]);

function isGlobalHealthActivityEntry(entry: {
  sourceType?: string | null;
  category?: string | null;
}): boolean {
  if (entry.sourceType === "health_record" || entry.sourceType === "health_ingest") {
    return true;
  }
  if (entry.category === "salud") return true;
  return false;
}

export async function filterContextEventsForUniverse<
  T extends { sourceRef: string | null; pillar?: string | null },
>(events: T[], universeSlug?: string): Promise<T[]> {
  if (!universeSlug || !shouldFilterByUniverse(universeSlug)) {
    return events;
  }

  const sourceIds = await resolveUniverseKgSourceIds(universeSlug);
  if (sourceIds.size === 0) {
    return events.filter((event) => isGlobalHealthContextEvent(event));
  }

  return events.filter((event) => {
    if (isGlobalHealthContextEvent(event)) return true;
    return event.sourceRef ? sourceIds.has(event.sourceRef) : false;
  });
}

function isGlobalHealthContextEvent(event: {
  pillar?: string | null;
  sourceRef?: string | null;
}): boolean {
  if (event.pillar && HEALTH_PILLARS.has(event.pillar)) return true;
  if (event.sourceRef?.startsWith("health:")) return true;
  return false;
}

export async function isAudioAssetInUniverse(
  assetId: string,
  universeSlug?: string,
): Promise<boolean> {
  if (!universeSlug || !shouldFilterByUniverse(universeSlug)) return true;
  const ids = await resolveUniverseAudioAssetIds(universeSlug);
  return ids?.has(assetId) ?? false;
}


export async function isReviewInUniverse(
  reviewId: string,
  assetId: string | null | undefined,
  universeSlug?: string,
): Promise<boolean> {
  if (!universeSlug || !shouldFilterByUniverse(universeSlug)) return true;
  const filtered = await filterReviewRecordsForUniverse(
    [{ reviewId, assetId: assetId ?? undefined }],
    universeSlug,
  );
  return filtered.length > 0;
}
