import "server-only";

import { shouldFilterByUniverse } from "@/lib/babel/context-seal";
import { getUniverseBySlug } from "@/lib/babel/universe-store";
import type { UniverseDto } from "@/lib/babel/types";
import type { DayOffset } from "@/lib/pendientes/types";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type UniverseProjection = {
  universe: UniverseDto;
  trenchesBoost: number;
};

export async function getUniverseProjection(
  slug: string,
): Promise<UniverseProjection | null> {
  const universe = await getUniverseBySlug(slug);
  if (!universe) return null;

  return {
    universe,
    trenchesBoost: universe.trenchesWeight ?? 0,
  };
}

export function buildPendingTaskUniverseFilter(
  universeSlug?: string,
): Prisma.PendingTaskWhereInput {
  if (!universeSlug || !shouldFilterByUniverse(universeSlug)) {
    return {};
  }

  return { universeSlug };
}

export function buildBabelRecordUniverseFilter(
  universeSlug?: string,
): Prisma.BabelRecordWhereInput {
  if (!universeSlug || !shouldFilterByUniverse(universeSlug)) {
    return {};
  }

  return { contextSeal: universeSlug };
}

export async function getTrenchesBoostForUniverse(
  universeSlug?: string,
): Promise<number> {
  if (!universeSlug) return 0;
  const projection = await getUniverseProjection(universeSlug);
  return projection?.trenchesBoost ?? 0;
}

export type ProjectForUniverseInput = {
  universeSlug: string;
  day?: DayOffset;
};

export async function countProjectedRecords(
  input: ProjectForUniverseInput,
): Promise<number> {
  const where = buildBabelRecordUniverseFilter(input.universeSlug);

  if (input.day) {
    const { dayRangeForOffset } = await import("@/lib/pendientes/day");
    const { start, end } = dayRangeForOffset(input.day);
    return prisma.babelRecord.count({
      where: {
        ...where,
        occurredAt: { gte: start, lt: end },
      },
    });
  }

  return prisma.babelRecord.count({ where });
}
