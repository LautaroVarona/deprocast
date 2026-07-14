import "server-only";

import { ensureBabelSchema } from "@/lib/babel/ensure-schema";
import type { ImportScope } from "@/lib/babel/types";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";

export type UniverseProjectionRow = {
  kind: string;
  physicalRef: string;
  sourceSlug: string;
  scope: string | null;
  scopeRef: string | null;
};

export async function listProjectionsForTarget(
  targetSlug: string,
): Promise<UniverseProjectionRow[]> {
  await ensureBabelSchema();

  return prisma.$queryRaw<UniverseProjectionRow[]>`
    SELECT "kind", "physicalRef", "sourceSlug", "scope", "scopeRef"
    FROM "UniverseProjection"
    WHERE "targetSlug" = ${targetSlug}
  `;
}

export async function findProjection(
  targetSlug: string,
  kind: string,
  physicalRef: string,
): Promise<UniverseProjectionRow | null> {
  await ensureBabelSchema();

  const rows = await prisma.$queryRaw<UniverseProjectionRow[]>`
    SELECT "kind", "physicalRef", "sourceSlug", "scope", "scopeRef"
    FROM "UniverseProjection"
    WHERE "targetSlug" = ${targetSlug}
      AND "kind" = ${kind}
      AND "physicalRef" = ${physicalRef}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function createProjection(input: {
  targetSlug: string;
  kind: string;
  physicalRef: string;
  sourceSlug: string;
  scope: ImportScope;
  scopeRef?: string | null;
}): Promise<boolean> {
  await ensureBabelSchema();

  const existing = await findProjection(
    input.targetSlug,
    input.kind,
    input.physicalRef,
  );
  if (existing) return false;

  await prisma.$executeRaw`
    INSERT INTO "UniverseProjection" (
      "id", "targetSlug", "kind", "physicalRef", "sourceSlug", "scope", "scopeRef", "importedAt"
    ) VALUES (
      ${randomUUID()},
      ${input.targetSlug},
      ${input.kind},
      ${input.physicalRef},
      ${input.sourceSlug},
      ${input.scope},
      ${input.scopeRef ?? null},
      CURRENT_TIMESTAMP
    )
  `;

  return true;
}
