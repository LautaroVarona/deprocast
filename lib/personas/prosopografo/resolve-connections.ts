import "server-only";

import { normalizeName } from "@/lib/kg/normalize";
import type { PersonaConnectionDraft } from "@/lib/personas/model";
import type { ProsopografoConnectionByName } from "@/lib/personas/prosopografo/schema";
import { prisma } from "@/lib/prisma";

export type ConnectionResolveResult = {
  connections: PersonaConnectionDraft[];
  warnings: string[];
};

/**
 * Resuelve connectionsByName → drafts con targetId de KgNode.
 * Si no hay match, omite el vínculo y agrega warning (no bloquea el alta).
 */
export async function resolveConnectionsByName(
  items: ProsopografoConnectionByName[] | undefined,
  personaLabel: string,
): Promise<ConnectionResolveResult> {
  if (!items?.length) {
    return { connections: [], warnings: [] };
  }

  const warnings: string[] = [];
  const connections: PersonaConnectionDraft[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const targetName = item.targetName.trim();
    const relationContext = item.relationContext.trim();
    if (!targetName || !relationContext) {
      warnings.push(
        `${personaLabel}: vínculo omitido (falta targetName o relationContext).`,
      );
      continue;
    }

    const type = item.targetKind === "proyecto" ? "proyecto" : "persona";
    const nodes = await prisma.kgNode.findMany({
      where: { type },
      select: { id: true, primaryName: true, aliases: true },
      take: 500,
    });

    const targetNorm = normalizeName(targetName);
    const match = nodes.find((node) => {
      if (normalizeName(node.primaryName) === targetNorm) return true;
      const aliases = Array.isArray(node.aliases)
        ? (node.aliases as unknown[])
        : [];
      return aliases.some(
        (alias) =>
          typeof alias === "string" && normalizeName(alias) === targetNorm,
      );
    });

    if (!match) {
      warnings.push(
        `${personaLabel}: no se encontró ${type} "${targetName}" en el grafo; vínculo omitido.`,
      );
      continue;
    }

    const key = `${type}:${match.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    connections.push({
      targetId: match.id,
      targetKind: item.targetKind,
      targetLabel: match.primaryName,
      relationContext,
      relationType: item.relationType?.trim() || undefined,
      strength:
        typeof item.strength === "number" && Number.isFinite(item.strength)
          ? item.strength
          : undefined,
    });
  }

  return { connections, warnings };
}
