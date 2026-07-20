import "server-only";

import { DEFAULT_KG_EDGE_WEIGHT, normalizeKgEdgeWeight } from "@/lib/validations/kg-schema";
import type { PendingTaskDto } from "@/lib/pendientes/types";
import { prisma } from "@/lib/prisma";

const ASALTO_RELATION = "asalto_trinchera";
const SELF_NODE_NAME = "Observador";
const SELF_NODE_TYPE = "persona";

async function ensureKgNode(
  primaryName: string,
  type: string,
  metadata: Record<string, unknown> = {},
): Promise<string> {
  const trimmed = primaryName.trim();
  const existing = await prisma.kgNode.findUnique({
    where: {
      primaryName_type: {
        primaryName: trimmed,
        type,
      },
    },
  });

  if (existing) return existing.id;

  const created = await prisma.kgNode.create({
    data: {
      primaryName: trimmed,
      type,
      aliases: [],
      metadata,
      confidence: 0.65,
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
  const selfNodeId = await resolveSelfNodeId();
  const actionNodeId = await ensureKgNode(task.title, "accion", {
    pendingTaskId: task.id,
    source: task.source,
  });
  const projectNodeId = await resolveProjectNodeId(task);

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
  let reconocido = false;

  switch (input.action) {
    case "suggest":
      reconocido = false;
      weight = baseWeight;
      break;
    case "recognize":
      reconocido = true;
      weight = Math.min(12, baseWeight + 1);
      break;
    case "calibrate":
      reconocido = true;
      weight = baseWeight;
      break;
    case "reject":
      reconocido = false;
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
