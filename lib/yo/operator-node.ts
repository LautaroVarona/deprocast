import "server-only";

import { parseAliasesJson, parseMetadataJson } from "@/lib/kg/normalize";
import { prisma } from "@/lib/prisma";
import { YO_CORE_ID } from "@/lib/yo/types";
import type { Prisma } from "@prisma/client";

export const OPERATOR_METADATA_ROLE = "operador";

export type OperatorPersonaNode = {
  id: string;
  primaryName: string;
};

function isOperatorMetadata(metadata: unknown): boolean {
  const parsed = parseMetadataJson(metadata);
  return (
    parsed.isOperator === true || parsed.role === OPERATOR_METADATA_ROLE
  );
}

function withOperatorMetadata(
  existing: unknown,
): Prisma.InputJsonValue {
  return {
    ...parseMetadataJson(existing),
    isOperator: true,
    role: OPERATOR_METADATA_ROLE,
  } as Prisma.InputJsonValue;
}

async function readOperatorName(): Promise<string | null> {
  const yo = await prisma.yo.findUnique({
    where: { id: YO_CORE_ID },
    select: { operatorName: true },
  });
  return yo?.operatorName?.trim() || null;
}

/**
 * Resuelve o crea el KgNode persona del Operador (nombre en Yo).
 * Es el hub natural de todos los grafos.
 */
export async function ensureOperatorPersonaNode(
  nameOverride?: string | null,
): Promise<OperatorPersonaNode | null> {
  const primaryName = nameOverride?.trim() || (await readOperatorName());
  if (!primaryName) return null;

  const personas = await prisma.kgNode.findMany({
    where: { type: "persona" },
    select: {
      id: true,
      primaryName: true,
      aliases: true,
      metadata: true,
      confidence: true,
      reconocido: true,
    },
  });

  const flagged = personas.find((node) => isOperatorMetadata(node.metadata));
  const byName = personas.find((node) => node.primaryName === primaryName);

  if (flagged) {
    if (flagged.primaryName === primaryName) {
      if (
        !flagged.reconocido ||
        !isOperatorMetadata(flagged.metadata) ||
        flagged.confidence < 1
      ) {
        const updated = await prisma.kgNode.update({
          where: { id: flagged.id },
          data: {
            metadata: withOperatorMetadata(flagged.metadata),
            confidence: Math.max(flagged.confidence, 1),
            reconocido: true,
          },
        });
        return { id: updated.id, primaryName: updated.primaryName };
      }
      return { id: flagged.id, primaryName: flagged.primaryName };
    }

    // Renombre del operador: mover primaryName si no hay colisión.
    const collision = byName && byName.id !== flagged.id ? byName : null;
    if (collision) {
      // Ya existe una persona con el nuevo nombre: esa pasa a ser el hub.
      const cleared = { ...parseMetadataJson(flagged.metadata) };
      delete cleared.isOperator;
      delete cleared.role;

      await prisma.kgNode.update({
        where: { id: flagged.id },
        data: {
          metadata: cleared as Prisma.InputJsonValue,
        },
      });

      const updated = await prisma.kgNode.update({
        where: { id: collision.id },
        data: {
          metadata: withOperatorMetadata(collision.metadata),
          confidence: Math.max(collision.confidence, 1),
          reconocido: true,
        },
      });
      return { id: updated.id, primaryName: updated.primaryName };
    }

    const aliases = parseAliasesJson(flagged.aliases);
    const previousName = flagged.primaryName;
    const nextAliases =
      previousName &&
      !aliases.some((alias) => alias.toLowerCase() === previousName.toLowerCase())
        ? [...aliases, previousName]
        : aliases;

    const updated = await prisma.kgNode.update({
      where: { id: flagged.id },
      data: {
        primaryName,
        aliases: nextAliases,
        metadata: withOperatorMetadata(flagged.metadata),
        confidence: Math.max(flagged.confidence, 1),
        reconocido: true,
      },
    });
    return { id: updated.id, primaryName: updated.primaryName };
  }

  if (byName) {
    const updated = await prisma.kgNode.update({
      where: { id: byName.id },
      data: {
        metadata: withOperatorMetadata(byName.metadata),
        confidence: Math.max(byName.confidence, 1),
        reconocido: true,
      },
    });
    return { id: updated.id, primaryName: updated.primaryName };
  }

  const created = await prisma.kgNode.create({
    data: {
      primaryName,
      type: "persona",
      aliases: [],
      metadata: withOperatorMetadata({}),
      confidence: 1,
      reconocido: true,
    },
  });

  return { id: created.id, primaryName: created.primaryName };
}

export async function getOperatorPersonaNodeId(): Promise<string | null> {
  const node = await ensureOperatorPersonaNode();
  return node?.id ?? null;
}
