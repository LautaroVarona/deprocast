import "server-only";

import { ROOT_UNIVERSE_SLUG } from "@/lib/babel/constants";
import { resolveUniverseDocumentIds } from "@/lib/babel/universe-documents";
import {
  createProjection,
  listProjectionsForTarget,
} from "@/lib/babel/projection-store";
import { getUniverseBySlug } from "@/lib/babel/universe-store";
import type { ImportScope } from "@/lib/babel/types";
import { listDocumentMeta } from "@/lib/meta-meteador/store";
import { buildProjectIndex, listCampos } from "@/lib/projects/service";
import { prisma } from "@/lib/prisma";

export type { ImportScope } from "@/lib/babel/types";

export type ImportFromUniverseInput = {
  targetSlug: string;
  sourceSlug: string;
  scope: ImportScope;
  scopeRef?: string;
};

type ProjectionCandidate = {
  kind: string;
  physicalRef: string;
};

async function collectSourceDocumentIds(
  sourceSlug: string,
  scope: ImportScope,
  scopeRef: string | undefined,
  projectIndex: Awaited<ReturnType<typeof buildProjectIndex>>,
): Promise<Set<string>> {
  const allMeta = await listDocumentMeta();
  const allIds = allMeta.map((row) => row.documentId);

  if (scope === "particula") {
    if (!scopeRef?.trim()) {
      throw new Error("Se requiere una partícula (documento) para importar.");
    }
    const documentId = scopeRef.trim();
    if (!allIds.includes(documentId)) {
      throw new Error("La partícula indicada no existe en el corpus.");
    }
    return new Set([documentId]);
  }

  if (scope === "campo") {
    if (!scopeRef?.trim()) {
      throw new Error("Se requiere un campo para importar.");
    }
    const campoSlug = scopeRef.trim();
    const campoIds = new Set<string>();
    for (const [documentId, project] of projectIndex) {
      if (project.campoSlug === campoSlug) {
        campoIds.add(documentId);
      }
    }
    return campoIds;
  }

  return resolveUniverseDocumentIds({
    universeSlug: sourceSlug,
    documentIds: allIds,
    projectIndex,
  });
}

async function collectBabelRecordsForDocuments(
  documentIds: Set<string>,
  sourceSlug: string,
): Promise<ProjectionCandidate[]> {
  const candidates: ProjectionCandidate[] = [];

  for (const documentId of documentIds) {
    candidates.push({ kind: "meta", physicalRef: documentId });
  }

  const babelRows = await prisma.babelRecord.findMany({
    where: {
      OR: [
        { contextSeal: sourceSlug },
        { physicalRef: { in: [...documentIds] } },
      ],
    },
    select: { kind: true, physicalRef: true, contextSeal: true, campoSlug: true },
  });

  for (const row of babelRows) {
    candidates.push({ kind: row.kind, physicalRef: row.physicalRef });
  }

  const sourceProjections = await listProjectionsForTarget(sourceSlug);

  for (const row of sourceProjections) {
    candidates.push({ kind: row.kind, physicalRef: row.physicalRef });
  }

  return candidates;
}

/** Importa (enlaza) materia de un universo origen al destino sin mover registros. */
export async function importFromUniverse(
  input: ImportFromUniverseInput,
): Promise<{ imported: number; skipped: number }> {
  const { targetSlug, sourceSlug, scope, scopeRef } = input;

  if (targetSlug === sourceSlug) {
    throw new Error("El universo origen y destino deben ser distintos.");
  }

  if (targetSlug === ROOT_UNIVERSE_SLUG) {
    throw new Error("Babel ya contiene todo el corpus; no requiere importación.");
  }

  const [target, source] = await Promise.all([
    getUniverseBySlug(targetSlug),
    getUniverseBySlug(sourceSlug),
  ]);

  if (!target) {
    throw new Error(`Universo destino "${targetSlug}" no encontrado.`);
  }
  if (!source) {
    throw new Error(`Universo origen "${sourceSlug}" no encontrado.`);
  }

  if (scope === "campo" && scopeRef) {
    const campos = await listCampos(sourceSlug);
    if (!campos.some((campo) => campo.slug === scopeRef)) {
      throw new Error(`Campo "${scopeRef}" no encontrado en el universo origen.`);
    }
  }

  const projectIndex = await buildProjectIndex();
  const documentIds = await collectSourceDocumentIds(
    sourceSlug,
    scope,
    scopeRef,
    projectIndex,
  );

  if (documentIds.size === 0) {
    return { imported: 0, skipped: 0 };
  }

  const candidates = await collectBabelRecordsForDocuments(documentIds, sourceSlug);
  const unique = new Map<string, ProjectionCandidate>();
  for (const candidate of candidates) {
    unique.set(`${candidate.kind}:${candidate.physicalRef}`, candidate);
  }

  let imported = 0;
  let skipped = 0;

  for (const candidate of unique.values()) {
    const created = await createProjection({
      targetSlug,
      kind: candidate.kind,
      physicalRef: candidate.physicalRef,
      sourceSlug,
      scope,
      scopeRef: scopeRef ?? null,
    });

    if (created) {
      imported += 1;
    } else {
      skipped += 1;
    }
  }

  return { imported, skipped };
}
