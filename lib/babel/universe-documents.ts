import "server-only";

import { shouldFilterByUniverse } from "@/lib/babel/context-seal";
import { listProjectionsForTarget } from "@/lib/babel/projection-store";
import { listCampos } from "@/lib/projects/service";
import type { Project } from "@/lib/projects/types";
import { prisma } from "@/lib/prisma";

export type UniverseDocumentMatchInput = {
  universeSlug: string;
  documentIds: string[];
  projectIndex: Map<string, Project>;
};

/** Resuelve qué documentIds pertenecen a un universo (sello, campos o proyección). */
export async function resolveUniverseDocumentIds(
  input: UniverseDocumentMatchInput,
): Promise<Set<string>> {
  const { universeSlug, documentIds, projectIndex } = input;

  if (!shouldFilterByUniverse(universeSlug)) {
    return new Set(documentIds);
  }

  const [campos, babelRefs, projections] = await Promise.all([
    listCampos(universeSlug),
    prisma.babelRecord.findMany({
      where: { contextSeal: universeSlug },
      select: { physicalRef: true },
    }),
    listProjectionsForTarget(universeSlug),
  ]);

  const campoSlugs = new Set(campos.map((campo) => campo.slug));
  const babelDocIds = new Set(babelRefs.map((record) => record.physicalRef));
  const projectedDocIds = new Set(
    projections
      .filter((row) => row.kind === "meta" || row.kind === "document")
      .map((row) => row.physicalRef),
  );
  const projectedRefs = new Set(projections.map((row) => row.physicalRef));

  const matched = new Set<string>();

  for (const documentId of documentIds) {
    if (
      babelDocIds.has(documentId) ||
      projectedDocIds.has(documentId) ||
      projectedRefs.has(documentId)
    ) {
      matched.add(documentId);
      continue;
    }

    const project = projectIndex.get(documentId);
    if (project?.campoSlug && campoSlugs.has(project.campoSlug)) {
      matched.add(documentId);
    }
  }

  return matched;
}
