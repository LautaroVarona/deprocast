import "server-only";

import { prisma } from "@/lib/prisma";
import { ensureOperatorPersonaNode } from "@/lib/yo/operator-node";
import type {
  SenadoGraphMember,
  SenadoGraphSnapshot,
} from "@/lib/yo/senado-types";

export type { SenadoGraphMember, SenadoGraphSnapshot } from "@/lib/yo/senado-types";

/** Personas vinculadas al Operador (PersonToPerson), sin contar al hub. */
export async function countOperatorLinkedPersonas(): Promise<number> {
  const operator = await ensureOperatorPersonaNode();
  if (!operator) return 0;

  return prisma.personToPerson.count({
    where: {
      OR: [{ personAId: operator.id }, { personBId: operator.id }],
    },
  });
}

/** Snapshot del Senado: Operador + personas ligadas con su vínculo. */
export async function getSenadoGraphSnapshot(): Promise<SenadoGraphSnapshot> {
  const operator = await ensureOperatorPersonaNode();
  if (!operator) {
    return { operator: null, members: [] };
  }

  const links = await prisma.personToPerson.findMany({
    where: {
      OR: [{ personAId: operator.id }, { personBId: operator.id }],
    },
    include: {
      personA: { select: { id: true, primaryName: true } },
      personB: { select: { id: true, primaryName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const members: SenadoGraphMember[] = [];
  const seen = new Set<string>();

  for (const link of links) {
    const other =
      link.personAId === operator.id ? link.personB : link.personA;
    if (seen.has(other.id)) continue;
    seen.add(other.id);
    members.push({
      id: other.id,
      name: other.primaryName,
      vinculo: link.relationContext?.trim() || link.relationType || "vínculo",
    });
  }

  return {
    operator: { id: operator.id, name: operator.primaryName },
    members,
  };
}
