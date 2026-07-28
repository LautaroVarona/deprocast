import "server-only";

import { prisma } from "@/lib/prisma";
import { ensureOperatorPersonaNode } from "@/lib/yo/operator-node";

/**
 * Nodos KG del núcleo Génesis: Operador (YO) + personas del Senado +
 * proyectos vinculados al hub. Deben permanecer visibles en cualquier
 * universo Babel — sin ellos la plataforma no debería estar abierta.
 */
export async function getGenesisCoreNodeIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  const operator = await ensureOperatorPersonaNode();
  if (!operator) return ids;

  ids.add(operator.id);

  const [personLinks, projectLinks] = await Promise.all([
    prisma.personToPerson.findMany({
      where: {
        OR: [{ personAId: operator.id }, { personBId: operator.id }],
      },
      select: { personAId: true, personBId: true },
    }),
    prisma.personToProject.findMany({
      where: { personId: operator.id },
      select: { projectId: true },
    }),
  ]);

  for (const link of personLinks) {
    ids.add(link.personAId === operator.id ? link.personBId : link.personAId);
  }
  for (const link of projectLinks) {
    ids.add(link.projectId);
  }

  return ids;
}

/** Une IDs de universo con el núcleo Génesis (nunca oculta YO/Senado/Prima). */
export async function withGenesisCoreNodeIds(
  universeNodeIds: Set<string> | null,
): Promise<Set<string> | null> {
  if (universeNodeIds === null) return null;
  const core = await getGenesisCoreNodeIds();
  if (core.size === 0) return universeNodeIds;
  return new Set([...universeNodeIds, ...core]);
}
