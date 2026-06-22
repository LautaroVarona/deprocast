import "server-only";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type PersonaStub = {
  id: string;
  primaryName: string;
};

export async function ensurePersonaStub(name: string): Promise<PersonaStub> {
  const primaryName = name.trim();
  if (!primaryName) {
    throw new Error("El nombre de la persona no puede estar vacío.");
  }

  const node = await prisma.kgNode.upsert({
    where: { primaryName_type: { primaryName, type: "persona" } },
    create: {
      primaryName,
      type: "persona",
      aliases: [],
      metadata: { stub: true, source: "incubadora" } as Prisma.InputJsonValue,
      confidence: 0.5,
    },
    update: {},
  });

  return { id: node.id, primaryName: node.primaryName };
}

export async function resolvePersonaNames(personIds: string[]): Promise<string[]> {
  if (personIds.length === 0) return [];

  const nodes = await prisma.kgNode.findMany({
    where: { id: { in: personIds }, type: "persona" },
    select: { id: true, primaryName: true },
  });

  const byId = new Map(nodes.map((node) => [node.id, node.primaryName]));
  return personIds
    .map((id) => byId.get(id))
    .filter((name): name is string => Boolean(name?.trim()));
}
