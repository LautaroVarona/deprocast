import { normalizeName, parseAliasesJson, parseMetadataJson } from "@/lib/kg/normalize";
import {
  buildEdgeMetadata,
  buildPersonaMetadata,
  kgNodeToPersona,
} from "@/lib/personas/mappers";
import type {
  CreatePersonaWithRelationsPayload,
  Persona,
  PersonaConnectionDraft,
} from "@/lib/personas/model";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function sanitizeAliases(
  nombrePrincipal: string,
  aliases: string[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const primaryNorm = normalizeName(nombrePrincipal);

  for (const alias of aliases) {
    const trimmed = alias.trim();
    if (!trimmed) continue;
    const norm = normalizeName(trimmed);
    if (norm === primaryNorm || seen.has(norm)) continue;
    seen.add(norm);
    result.push(trimmed);
  }

  return result;
}

function normalizeConnections(
  connections: PersonaConnectionDraft[] | undefined,
): PersonaConnectionDraft[] {
  if (!connections?.length) return [];

  const seen = new Set<string>();
  const result: PersonaConnectionDraft[] = [];

  for (const raw of connections) {
    const targetId = raw.targetId?.trim();
    const relationContext = raw.relationContext?.trim() ?? "";
    if (!targetId || !relationContext) continue;
    if (raw.targetKind !== "persona" && raw.targetKind !== "proyecto") continue;

    const key = `${raw.targetKind}:${targetId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      targetId,
      targetKind: raw.targetKind,
      targetLabel: raw.targetLabel?.trim() || targetId,
      relationContext,
      relationType: raw.relationType?.trim() || undefined,
      strength:
        typeof raw.strength === "number" && Number.isFinite(raw.strength)
          ? raw.strength
          : undefined,
    });
  }

  return result;
}

/**
 * Alta manual de persona + aliases + vínculos tipados en una sola transacción.
 * Dual-write: PersonTo* (CRM tipado) + KgEdge (grafo existente).
 */
export async function createPersonaWithRelations(
  input: CreatePersonaWithRelationsPayload,
): Promise<Persona> {
  const nombrePrincipal = input.nombrePrincipal.trim();
  if (!nombrePrincipal) {
    throw new Error("El nombre es obligatorio.");
  }

  const aliases = sanitizeAliases(nombrePrincipal, input.aliases ?? []);
  const connections = normalizeConnections(input.connections);
  const metadata = buildPersonaMetadata({
    notasGenerales: input.notasGenerales ?? "",
  });

  return prisma.$transaction(async (tx) => {
    const existing = await tx.kgNode.findUnique({
      where: {
        primaryName_type: {
          primaryName: nombrePrincipal,
          type: "persona",
        },
      },
    });

    let personId: string;

    if (existing) {
      const mergedAliases = sanitizeAliases(nombrePrincipal, [
        ...parseAliasesJson(existing.aliases),
        ...aliases,
      ]);
      const mergedMeta = buildPersonaMetadata({
        existing: parseMetadataJson(existing.metadata),
        notasGenerales: input.notasGenerales ?? "",
      });

      const updated = await tx.kgNode.update({
        where: { id: existing.id },
        data: {
          aliases: mergedAliases,
          metadata: mergedMeta as Prisma.InputJsonValue,
          reconocido: true,
          confidence: Math.max(existing.confidence, 0.85),
        },
      });
      personId = updated.id;
    } else {
      const created = await tx.kgNode.create({
        data: {
          primaryName: nombrePrincipal,
          type: "persona",
          aliases,
          metadata: metadata as Prisma.InputJsonValue,
          confidence: 0.85,
          reconocido: true,
        },
      });
      personId = created.id;
    }

    for (const connection of connections) {
      if (connection.targetId === personId) {
        throw new Error("Una persona no puede vincularse consigo misma.");
      }

      const target = await tx.kgNode.findUnique({
        where: { id: connection.targetId },
      });
      if (!target) {
        throw new Error(
          `Entidad destino no encontrada: ${connection.targetLabel}`,
        );
      }

      if (connection.targetKind === "persona") {
        if (target.type !== "persona") {
          throw new Error(
            `"${connection.targetLabel}" no es una persona del grafo.`,
          );
        }

        const relationType =
          connection.relationType?.trim() || "relacionado_con";

        await tx.personToPerson.upsert({
          where: {
            personAId_personBId: {
              personAId: personId,
              personBId: connection.targetId,
            },
          },
          create: {
            personAId: personId,
            personBId: connection.targetId,
            relationContext: connection.relationContext,
            relationType,
            strength: connection.strength,
          },
          update: {
            relationContext: connection.relationContext,
            relationType,
            strength: connection.strength,
          },
        });

        await tx.kgEdge.upsert({
          where: {
            sourceNodeId_targetNodeId_relationType: {
              sourceNodeId: personId,
              targetNodeId: connection.targetId,
              relationType,
            },
          },
          create: {
            sourceNodeId: personId,
            targetNodeId: connection.targetId,
            relationType,
            context: connection.relationContext,
            weight: connection.strength,
            metadata: {},
            reconocido: true,
          },
          update: {
            context: connection.relationContext,
            weight: connection.strength ?? undefined,
            reconocido: true,
          },
        });
        continue;
      }

      if (target.type !== "proyecto") {
        throw new Error(
          `"${connection.targetLabel}" no es un proyecto del grafo.`,
        );
      }

      const relationType =
        connection.relationType?.trim() || "participa_en";
      const edgeMetadata = buildEdgeMetadata({
        rolPrincipal: relationType,
      });

      await tx.personToProject.upsert({
        where: {
          personId_projectId: {
            personId,
            projectId: connection.targetId,
          },
        },
        create: {
          personId,
          projectId: connection.targetId,
          relationContext: connection.relationContext,
          relationType,
          strength: connection.strength,
        },
        update: {
          relationContext: connection.relationContext,
          relationType,
          strength: connection.strength,
        },
      });

      await tx.kgEdge.upsert({
        where: {
          sourceNodeId_targetNodeId_relationType: {
            sourceNodeId: personId,
            targetNodeId: connection.targetId,
            relationType: "participa_en",
          },
        },
        create: {
          sourceNodeId: personId,
          targetNodeId: connection.targetId,
          relationType: "participa_en",
          context: connection.relationContext,
          weight: connection.strength,
          metadata: edgeMetadata as Prisma.InputJsonValue,
          reconocido: true,
        },
        update: {
          context: connection.relationContext,
          weight: connection.strength ?? undefined,
          metadata: edgeMetadata as Prisma.InputJsonValue,
          reconocido: true,
        },
      });
    }

    const node = await tx.kgNode.findUniqueOrThrow({ where: { id: personId } });
    return kgNodeToPersona(node);
  });
}
