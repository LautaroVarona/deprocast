import "server-only";

import type { Persona } from "@/lib/personas/model";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type ClientPersonaHint = {
  id: string;
  nombrePrincipal: string;
  aliases?: string[];
  notasGenerales?: string;
};

/**
 * Rehidrata KgNode persona desde hints del navegador (localStorage)
 * cuando SQLite en Vercel nace vacío tras un cold start.
 */
export async function applyClientPersonaSnapshot(
  hints: ClientPersonaHint[] | undefined,
): Promise<number> {
  if (!hints?.length) return 0;

  let applied = 0;
  for (const hint of hints.slice(0, 40)) {
    const id = hint.id?.trim();
    const name = hint.nombrePrincipal?.trim();
    if (!id || !name) continue;

    const byId = await prisma.kgNode.findFirst({
      where: { id, type: "persona" },
    });
    if (byId) {
      if (!byId.reconocido) {
        await prisma.kgNode.update({
          where: { id: byId.id },
          data: { reconocido: true },
        });
      }
      continue;
    }

    const byName = await prisma.kgNode.findUnique({
      where: { primaryName_type: { primaryName: name, type: "persona" } },
    });
    if (byName) {
      if (!byName.reconocido) {
        await prisma.kgNode.update({
          where: { id: byName.id },
          data: { reconocido: true },
        });
      }
      continue;
    }

    await prisma.kgNode.create({
      data: {
        id,
        primaryName: name,
        type: "persona",
        aliases: (hint.aliases ?? []) as Prisma.InputJsonValue,
        metadata: {
          notas: hint.notasGenerales ?? "",
          rehydrated: true,
          source: "client-cache",
        } as Prisma.InputJsonValue,
        confidence: 0.75,
        reconocido: true,
      },
    });
    applied += 1;
  }

  return applied;
}

export function parsePersonaCacheHeader(
  raw: string | null,
): ClientPersonaHint[] | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    const hints: ClientPersonaHint[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.id !== "string" || typeof row.nombrePrincipal !== "string") {
        continue;
      }
      hints.push({
        id: row.id,
        nombrePrincipal: row.nombrePrincipal,
        aliases: Array.isArray(row.aliases)
          ? row.aliases.filter((a): a is string => typeof a === "string")
          : undefined,
        notasGenerales:
          typeof row.notasGenerales === "string" ? row.notasGenerales : undefined,
      });
    }
    return hints.length ? hints : undefined;
  } catch {
    return undefined;
  }
}

export function personaHintsFromEntities(personas: Persona[]): ClientPersonaHint[] {
  return personas.map((p) => ({
    id: p.id,
    nombrePrincipal: p.nombrePrincipal,
    aliases: p.aliases ?? [],
    notasGenerales: p.notasGenerales,
  }));
}
