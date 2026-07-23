import { parseAliasesJson, parseMetadataJson } from "@/lib/kg/normalize";
import { prisma } from "@/lib/prisma";
import type {
  EntityCandidateDto,
  EntityCandidateStatus,
  EntityCandidateType,
  TriageMergeTarget,
} from "@/lib/triage/types";
import { Prisma } from "@prisma/client";

function asType(value: string): EntityCandidateType {
  return value === "PROJECT" ? "PROJECT" : "PERSON";
}

function asStatus(value: string): EntityCandidateStatus {
  if (
    value === "APPROVED" ||
    value === "REJECTED" ||
    value === "MERGED" ||
    value === "PENDING"
  ) {
    return value;
  }
  return "PENDING";
}

function toDto(row: {
  id: string;
  name: string;
  type: string;
  contextSnippet: string;
  sourceId: string | null;
  status: string;
  resolvedNodeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): EntityCandidateDto {
  return {
    id: row.id,
    name: row.name,
    type: asType(row.type),
    contextSnippet: row.contextSnippet,
    sourceId: row.sourceId,
    status: asStatus(row.status),
    resolvedNodeId: row.resolvedNodeId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Alimenta la cola desde KgNodes no reconocidos (HITL legacy → triage). */
export async function syncKgPendingIntoCandidates(): Promise<number> {
  const pendingNodes = await prisma.kgNode.findMany({
    where: {
      reconocido: false,
      type: { in: ["persona", "proyecto"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });

  if (pendingNodes.length === 0) return 0;

  let inserted = 0;
  for (const node of pendingNodes) {
    const existing = await prisma.entityCandidate.findFirst({
      where: {
        OR: [
          { resolvedNodeId: node.id },
          {
            name: node.primaryName,
            type: node.type === "proyecto" ? "PROJECT" : "PERSON",
            status: "PENDING",
          },
        ],
      },
    });
    if (existing) continue;

    const metadata = parseMetadataJson(node.metadata);
    const snippet =
      typeof metadata.extractionSnippet === "string" &&
      metadata.extractionSnippet.trim()
        ? metadata.extractionSnippet.trim()
        : typeof metadata.stubReason === "string" && metadata.stubReason.trim()
          ? metadata.stubReason.trim()
          : `Mastropiero detectó «${node.primaryName}» en el grafo sin sellar.`;

    const sourceId =
      typeof metadata.sourceId === "string"
        ? metadata.sourceId
        : typeof metadata.originRef === "string"
          ? metadata.originRef
          : null;

    await prisma.entityCandidate.create({
      data: {
        name: node.primaryName,
        type: node.type === "proyecto" ? "PROJECT" : "PERSON",
        contextSnippet: snippet,
        sourceId,
        status: "PENDING",
        resolvedNodeId: node.id,
        metadata: {
          seededFromKgNode: true,
          kgNodeId: node.id,
        } as Prisma.InputJsonValue,
      },
    });
    inserted += 1;
  }

  return inserted;
}

export async function listPendingCandidates(
  limit = 40,
): Promise<EntityCandidateDto[]> {
  await syncKgPendingIntoCandidates();

  const rows = await prisma.entityCandidate.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return rows.map(toDto);
}

export async function enqueueEntityCandidate(input: {
  name: string;
  type: EntityCandidateType;
  contextSnippet: string;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<EntityCandidateDto> {
  const name = input.name.trim();
  if (!name) throw new Error("El nombre de la candidata es obligatorio.");
  const contextSnippet = input.contextSnippet.trim();
  if (!contextSnippet) {
    throw new Error("El fragmento de contexto es obligatorio.");
  }

  const row = await prisma.entityCandidate.create({
    data: {
      name,
      type: input.type,
      contextSnippet,
      sourceId: input.sourceId?.trim() || null,
      status: "PENDING",
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  return toDto(row);
}

async function assertPending(id: string) {
  const row = await prisma.entityCandidate.findUnique({ where: { id } });
  if (!row) throw new Error("Candidata no encontrada.");
  if (row.status !== "PENDING") {
    throw new Error("La candidata ya fue procesada.");
  }
  return row;
}

export async function rejectCandidate(id: string): Promise<EntityCandidateDto> {
  await assertPending(id);
  const row = await prisma.entityCandidate.update({
    where: { id },
    data: { status: "REJECTED" },
  });

  if (row.resolvedNodeId) {
    const node = await prisma.kgNode.findUnique({
      where: { id: row.resolvedNodeId },
    });
    if (node && !node.reconocido) {
      await prisma.kgNode.update({
        where: { id: node.id },
        data: {
          metadata: {
            ...parseMetadataJson(node.metadata),
            triageRejected: true,
            rejectedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
    }
  }

  return toDto(row);
}

export async function approveCandidate(
  id: string,
): Promise<EntityCandidateDto> {
  const pending = await assertPending(id);

  return prisma.$transaction(async (tx) => {
    const nodeType = pending.type === "PROJECT" ? "proyecto" : "persona";
    let nodeId = pending.resolvedNodeId;

    if (nodeId) {
      const existing = await tx.kgNode.findUnique({ where: { id: nodeId } });
      if (existing) {
        const metadata = {
          ...parseMetadataJson(existing.metadata),
          triageApproved: true,
          extractionSnippet: pending.contextSnippet,
          ...(pending.type === "PERSON"
            ? { notas: pending.contextSnippet }
            : {}),
        };
        await tx.kgNode.update({
          where: { id: existing.id },
          data: {
            reconocido: true,
            confidence: Math.max(existing.confidence, 0.85),
            metadata: metadata as Prisma.InputJsonValue,
          },
        });
        nodeId = existing.id;
      } else {
        nodeId = null;
      }
    }

    if (!nodeId) {
      const byName = await tx.kgNode.findUnique({
        where: {
          primaryName_type: {
            primaryName: pending.name,
            type: nodeType,
          },
        },
      });

      if (byName) {
        await tx.kgNode.update({
          where: { id: byName.id },
          data: {
            reconocido: true,
            confidence: Math.max(byName.confidence, 0.85),
          },
        });
        nodeId = byName.id;
      } else {
        const created = await tx.kgNode.create({
          data: {
            primaryName: pending.name,
            type: nodeType,
            aliases: [],
            metadata: {
              triageApproved: true,
              extractionSnippet: pending.contextSnippet,
              ...(pending.type === "PERSON"
                ? { notas: pending.contextSnippet, personaKind: "fisica" }
                : {}),
            } as Prisma.InputJsonValue,
            confidence: 0.85,
            reconocido: true,
          },
        });
        nodeId = created.id;
      }
    }

    if (pending.sourceId) {
      await tx.kgMention.create({
        data: {
          nodeId,
          sourceType: "triage",
          sourceId: pending.sourceId,
          fragment: pending.contextSnippet,
          confidence: 0.8,
          metadata: {
            candidateId: pending.id,
            via: "approve",
          } as Prisma.InputJsonValue,
        },
      });
    }

    const row = await tx.entityCandidate.update({
      where: { id: pending.id },
      data: {
        status: "APPROVED",
        resolvedNodeId: nodeId,
      },
    });

    return toDto(row);
  });
}

export async function mergeCandidate(
  id: string,
  targetNodeId: string,
): Promise<EntityCandidateDto> {
  const pending = await assertPending(id);
  const targetId = targetNodeId.trim();
  if (!targetId) throw new Error("Indicá la entidad destino.");

  return prisma.$transaction(async (tx) => {
    const target = await tx.kgNode.findUnique({ where: { id: targetId } });
    if (!target) throw new Error("Entidad destino no encontrada.");

    const expectedType = pending.type === "PROJECT" ? "proyecto" : "persona";
    if (target.type !== expectedType) {
      throw new Error(
        `El destino debe ser un ${expectedType} (recibido: ${target.type}).`,
      );
    }

    const aliases = parseAliasesJson(target.aliases);
    const aliasNorm = pending.name.trim().toLowerCase();
    const alreadyAlias = aliases.some(
      (alias) => alias.trim().toLowerCase() === aliasNorm,
    );
    const isPrimary =
      target.primaryName.trim().toLowerCase() === aliasNorm;

    if (!alreadyAlias && !isPrimary && pending.name.trim()) {
      aliases.push(pending.name.trim());
    }

    await tx.kgNode.update({
      where: { id: target.id },
      data: {
        aliases,
        reconocido: true,
        confidence: Math.max(target.confidence, 0.85),
      },
    });

    if (pending.sourceId) {
      await tx.kgMention.create({
        data: {
          nodeId: target.id,
          sourceType: "triage",
          sourceId: pending.sourceId,
          fragment: pending.contextSnippet,
          confidence: 0.85,
          metadata: {
            candidateId: pending.id,
            via: "merge",
            mergedName: pending.name,
          } as Prisma.InputJsonValue,
        },
      });
    }

    // Si la candidata apuntaba a un stub distinto, redirigimos menciones.
    if (pending.resolvedNodeId && pending.resolvedNodeId !== target.id) {
      await tx.kgMention.updateMany({
        where: { nodeId: pending.resolvedNodeId },
        data: { nodeId: target.id },
      });
      await tx.kgNode.deleteMany({
        where: { id: pending.resolvedNodeId, reconocido: false },
      });
    }

    const row = await tx.entityCandidate.update({
      where: { id: pending.id },
      data: {
        status: "MERGED",
        resolvedNodeId: target.id,
      },
    });

    return toDto(row);
  });
}

export async function searchMergeTargets(input: {
  type: EntityCandidateType;
  q: string;
  limit?: number;
}): Promise<TriageMergeTarget[]> {
  const q = input.q.trim().toLowerCase();
  const nodeType = input.type === "PROJECT" ? "proyecto" : "persona";
  const nodes = await prisma.kgNode.findMany({
    where: {
      type: nodeType,
      reconocido: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 120,
  });

  const filtered = nodes.filter((node) => {
    if (!q) return true;
    const aliases = parseAliasesJson(node.aliases);
    const haystack = [node.primaryName, ...aliases]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  return filtered.slice(0, input.limit ?? 12).map((node) => {
    const aliases = parseAliasesJson(node.aliases);
    return {
      id: node.id,
      label: node.primaryName,
      kind: nodeType === "proyecto" ? "proyecto" : "persona",
      sublabel: aliases.length ? aliases.slice(0, 3).join(", ") : null,
    };
  });
}
