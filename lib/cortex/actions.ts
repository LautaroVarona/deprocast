"use server";

import {
  clampHermeticGravity,
  isTriageEntityType,
  type TriageCardDto,
  type TriageEntityType,
} from "@/lib/cortex/triage-types";
import { listTriageQueue } from "@/lib/cortex/triage-queue";
import {
  recognizePendingTask,
  rejectPendingTask,
} from "@/lib/pendientes/store";
import { prisma } from "@/lib/prisma";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { normalizeKgEdgeWeight } from "@/lib/validations/kg-schema";

export type CortexActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function ready() {
  await ensureRuntimeReady();
}

function fail(error: unknown, fallback: string): CortexActionResult<never> {
  return {
    ok: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

export async function listTriageQueueAction(): Promise<
  CortexActionResult<TriageCardDto[]>
> {
  try {
    await ready();
    const data = await listTriageQueue();
    return { ok: true, data };
  } catch (error) {
    return fail(error, "No se pudo cargar la cola de entropía.");
  }
}

/**
 * Coagula una entidad propuesta: `reconocido: true` / status recognized.
 */
export async function coagulateEntity(
  id: string,
  type: TriageEntityType,
): Promise<CortexActionResult<{ id: string; entityType: TriageEntityType }>> {
  try {
    await ready();
    if (!id || !isTriageEntityType(type)) {
      return { ok: false, error: "Entidad de triage inválida." };
    }

    if (type === "pending_task") {
      await recognizePendingTask(id);
    } else if (type === "quantomo") {
      const quantomo = await prisma.quantomo.findUnique({
        where: { id },
        select: { kgNodeId: true },
      });
      if (!quantomo) {
        return { ok: false, error: "Quántomo no encontrado." };
      }
      if (quantomo.kgNodeId) {
        await prisma.kgNode.update({
          where: { id: quantomo.kgNodeId },
          data: { reconocido: true },
        });
      }
    } else {
      const edge = await prisma.kgEdge.findUnique({ where: { id } });
      if (!edge) {
        return { ok: false, error: "Arista no encontrada." };
      }
      if (!edge.reconocido) {
        await prisma.kgEdge.update({
          where: { id },
          data: { reconocido: true },
        });
      }
    }

    return { ok: true, data: { id, entityType: type } };
  } catch (error) {
    return fail(error, "No se pudo coagular la entidad.");
  }
}

/**
 * Descarta: borra el registro (o marca rejected en PendingTask).
 */
export async function discardEntity(
  id: string,
  type: TriageEntityType,
): Promise<CortexActionResult<{ id: string; entityType: TriageEntityType }>> {
  try {
    await ready();
    if (!id || !isTriageEntityType(type)) {
      return { ok: false, error: "Entidad de triage inválida." };
    }

    if (type === "pending_task") {
      const existing = await prisma.pendingTask.findUnique({ where: { id } });
      if (!existing) {
        return { ok: false, error: "Tarea no encontrada." };
      }
      // Marca ignorada + purga: cola sin residuos.
      await rejectPendingTask(id).catch(() => undefined);
      await prisma.pendingTask.delete({ where: { id } }).catch(() => undefined);
    } else if (type === "quantomo") {
      const quantomo = await prisma.quantomo.findUnique({
        where: { id },
        select: { kgNodeId: true },
      });
      if (!quantomo) {
        return { ok: false, error: "Quántomo no encontrado." };
      }
      const nodeId = quantomo.kgNodeId;
      await prisma.quantomo.delete({ where: { id } });
      if (nodeId) {
        await prisma.kgNode
          .delete({ where: { id: nodeId } })
          .catch(() => undefined);
      }
    } else {
      const edge = await prisma.kgEdge.findUnique({ where: { id } });
      if (!edge) {
        return { ok: false, error: "Arista no encontrada." };
      }
      if (edge.reconocido) {
        return {
          ok: false,
          error: "No se puede descartar una arista ya coagulada.",
        };
      }
      await prisma.kgEdge.delete({ where: { id } });
    }

    return { ok: true, data: { id, entityType: type } };
  } catch (error) {
    return fail(error, "No se pudo descartar la entidad.");
  }
}

/**
 * Edita título/gravedad y coagula en un solo paso (swipe ↑).
 */
export async function editAndCoagulateEntity(input: {
  id: string;
  type: TriageEntityType;
  title?: string;
  gravity?: number;
}): Promise<CortexActionResult<{ id: string; entityType: TriageEntityType }>> {
  try {
    await ready();
    const { id, type } = input;
    if (!id || !isTriageEntityType(type)) {
      return { ok: false, error: "Entidad de triage inválida." };
    }

    const title = input.title?.trim();
    const gravity =
      typeof input.gravity === "number"
        ? clampHermeticGravity(input.gravity)
        : undefined;

    if (type === "pending_task") {
      await prisma.pendingTask.update({
        where: { id },
        data: {
          ...(title ? { title } : {}),
          ...(gravity !== undefined ? { weight: gravity } : {}),
        },
      });
      await recognizePendingTask(id);
    } else if (type === "quantomo") {
      const quantomo = await prisma.quantomo.findUnique({
        where: { id },
        select: { kgNodeId: true, titleSugerido: true },
      });
      if (!quantomo) {
        return { ok: false, error: "Quántomo no encontrado." };
      }

      if (title) {
        await prisma.quantomo.update({
          where: { id },
          data: { titleSugerido: title },
        });
      }

      if (quantomo.kgNodeId) {
        const nextTitle = title ?? quantomo.titleSugerido;
        await prisma.kgNode.update({
          where: { id: quantomo.kgNodeId },
          data: {
            reconocido: true,
            ...(title
              ? {
                  aliases: [nextTitle],
                  primaryName: `${nextTitle.slice(0, 100)} · ${id.slice(0, 8)}`,
                }
              : {}),
            ...(gravity !== undefined
              ? { confidence: gravity / 12 }
              : {}),
          },
        });
      }
    } else {
      const edge = await prisma.kgEdge.findUnique({ where: { id } });
      if (!edge) {
        return { ok: false, error: "Arista no encontrada." };
      }
      const weight =
        gravity !== undefined
          ? normalizeKgEdgeWeight(gravity).weight
          : edge.weight;
      await prisma.kgEdge.update({
        where: { id },
        data: {
          reconocido: true,
          weight,
          ...(title ? { context: title } : {}),
        },
      });
    }

    return { ok: true, data: { id, entityType: type } };
  } catch (error) {
    return fail(error, "No se pudo editar y coagular la entidad.");
  }
}
