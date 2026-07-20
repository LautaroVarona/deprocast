import "server-only";

import { DEFAULT_KG_EDGE_WEIGHT, normalizeKgEdgeWeight } from "@/lib/validations/kg-schema";
import type { PendingTaskDto } from "@/lib/pendientes/types";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const ASALTO_RELATION = "asalto_trinchera";
const SELF_NODE_NAME = "Observador";
const SELF_NODE_TYPE = "persona";

async function ensureKgNode(
  primaryName: string,
  type: string,
  metadata: Prisma.InputJsonValue = {} as Prisma.InputJsonValue,
  options: { reconocido?: boolean } = {},
): Promise<string> {
  const trimmed = primaryName.trim();
  const reconocido = options.reconocido ?? false;
  const existing = await prisma.kgNode.findUnique({
    where: {
      primaryName_type: {
        primaryName: trimmed,
        type,
      },
    },
  });

  if (existing) {
    if (reconocido && !existing.reconocido) {
      await prisma.kgNode.update({
        where: { id: existing.id },
        data: { reconocido: true },
      });
    }
    return existing.id;
  }

  const created = await prisma.kgNode.create({
    data: {
      primaryName: trimmed,
      type,
      aliases: [],
      metadata,
      confidence: 0.65,
      reconocido,
    },
  });

  return created.id;
}

async function resolveProjectNodeId(task: PendingTaskDto): Promise<string> {
  const projectLabel =
    task.projectId?.trim() ||
    task.universeSlug?.trim() ||
    "babel";

  return ensureKgNode(projectLabel, "proyecto", {
    projectId: task.projectId,
    universeSlug: task.universeSlug,
  });
}

async function resolveSelfNodeId(): Promise<string> {
  return ensureKgNode(SELF_NODE_NAME, SELF_NODE_TYPE, { role: "observador" });
}

export type AsaltoMirrorAction = "suggest" | "recognize" | "calibrate" | "reject";

export type SyncAsaltoMirrorInput = {
  action: AsaltoMirrorAction;
  weight?: number;
};

export async function syncAsaltoMirrorFromTask(
  task: PendingTaskDto,
  input: SyncAsaltoMirrorInput,
): Promise<void> {
  let reconocido = false;

  switch (input.action) {
    case "suggest":
      reconocido = false;
      break;
    case "recognize":
    case "calibrate":
      reconocido = true;
      break;
    case "reject":
      reconocido = false;
      break;
  }

  const selfNodeId = await resolveSelfNodeId();
  // Observador is always part of the validated graph surface
  await prisma.kgNode.updateMany({
    where: { id: selfNodeId, reconocido: false },
    data: { reconocido: true },
  });

  const actionNodeId = await ensureKgNode(
    task.title,
    "accion",
    {
      pendingTaskId: task.id,
      source: task.source,
    },
    { reconocido },
  );
  const projectNodeId = await resolveProjectNodeId(task);
  if (reconocido) {
    await prisma.kgNode.updateMany({
      where: { id: { in: [projectNodeId] }, reconocido: false },
      data: { reconocido: true },
    });
  }

  const existing = await prisma.kgEdge.findUnique({
    where: {
      sourceNodeId_targetNodeId_relationType: {
        sourceNodeId: selfNodeId,
        targetNodeId: actionNodeId,
        relationType: ASALTO_RELATION,
      },
    },
  });

  const baseWeight = normalizeKgEdgeWeight(
    input.weight ?? task.weight ?? existing?.weight ?? DEFAULT_KG_EDGE_WEIGHT,
  ).weight;

  let weight = baseWeight;

  switch (input.action) {
    case "suggest":
      weight = baseWeight;
      break;
    case "recognize":
      weight = Math.min(12, baseWeight + 1);
      break;
    case "calibrate":
    case "reject":
      weight = baseWeight;
      break;
  }

  const metadata = {
    pendingTaskId: task.id,
    projectId: task.projectId,
    universeSlug: task.universeSlug,
    projectNodeId,
    mirrorAction: input.action,
    syncedAt: new Date().toISOString(),
  };

  await prisma.kgEdge.upsert({
    where: {
      sourceNodeId_targetNodeId_relationType: {
        sourceNodeId: selfNodeId,
        targetNodeId: actionNodeId,
        relationType: ASALTO_RELATION,
      },
    },
    create: {
      sourceNodeId: selfNodeId,
      targetNodeId: actionNodeId,
      relationType: ASALTO_RELATION,
      context: task.description?.slice(0, 280) || task.title,
      weight,
      reconocido,
      metadata,
    },
    update: {
      context: task.description?.slice(0, 280) || task.title,
      weight,
      reconocido,
      metadata,
    },
  });

  await prisma.kgEdge.upsert({
    where: {
      sourceNodeId_targetNodeId_relationType: {
        sourceNodeId: actionNodeId,
        targetNodeId: projectNodeId,
        relationType: "pertenece_a",
      },
    },
    create: {
      sourceNodeId: actionNodeId,
      targetNodeId: projectNodeId,
      relationType: "pertenece_a",
      context: `Asalto de trinchera: ${task.title}`,
      weight,
      reconocido,
      metadata: {
        pendingTaskId: task.id,
        mirror: true,
      },
    },
    update: {
      weight,
      reconocido,
      metadata: {
        pendingTaskId: task.id,
        mirror: true,
      },
    },
  });
}
