import "server-only";

import { normalizeName } from "@/lib/kg/normalize";
import type { PersonaConnectionDraft } from "@/lib/personas/model";
import type { ProsopografoConnectionByName } from "@/lib/personas/prosopografo/schema";
import { listProjects } from "@/lib/projects/service";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type ConnectionResolveResult = {
  connections: PersonaConnectionDraft[];
  warnings: string[];
};

/**
 * Resuelve connectionsByName → drafts con targetId de KgNode.
 * Personas: match en grafo. Proyectos: grafo + archivos Atanor (crea nodo si hace falta).
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
  const fileProjects = await listProjects();

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
    const targetNorm = normalizeName(targetName);

    const nodes = await prisma.kgNode.findMany({
      where: { type },
      select: { id: true, primaryName: true, aliases: true },
      take: 500,
    });

    let match = nodes.find((node) => {
      if (normalizeName(node.primaryName) === targetNorm) return true;
      const aliases = Array.isArray(node.aliases)
        ? (node.aliases as unknown[])
        : [];
      return aliases.some(
        (alias) =>
          typeof alias === "string" && normalizeName(alias) === targetNorm,
      );
    });

    if (!match && type === "proyecto") {
      const fileMatch = fileProjects.find(
        (project) => normalizeName(project.title) === targetNorm,
      );
      if (fileMatch) {
        const existingByName = await prisma.kgNode.findUnique({
          where: {
            primaryName_type: {
              primaryName: fileMatch.title,
              type: "proyecto",
            },
          },
          select: { id: true, primaryName: true, aliases: true },
        });
        if (existingByName) {
          match = existingByName;
        } else {
          const created = await prisma.kgNode.create({
            data: {
              primaryName: fileMatch.title,
              type: "proyecto",
              aliases: [],
              metadata: {
                projectId: fileMatch.id,
                campoSlug: fileMatch.campoSlug,
                estado: fileMatch.estado,
              } as Prisma.InputJsonValue,
              confidence: 0.85,
              reconocido: true,
            },
          });
          match = {
            id: created.id,
            primaryName: created.primaryName,
            aliases: [],
          };
        }
      }
    }

    if (!match) {
      warnings.push(
        `${personaLabel}: no se encontró ${type} "${targetName}" en el grafo${
          type === "proyecto" ? " ni en el Atanor" : ""
        }; vínculo omitido.`,
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
