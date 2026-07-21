import "server-only";

import { calibratePendingTask } from "@/lib/pendientes/store";
import { clampScale } from "@/lib/projects/priority";
import { updateProjectPriority } from "@/lib/projects/service";
import type { VibeCalibrationCard } from "./types";

export type OriginSyncKind = "project" | "pending_task" | "skipped" | "failed";

export type OriginSyncResult = {
  kind: OriginSyncKind;
  applied: boolean;
  entityId?: string;
  weight: number;
  label?: string;
  error?: string;
};

function resolveProjectId(card: VibeCalibrationCard): string | null {
  const fromMeta = card.metadata.projectId;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }

  const match = /^validated:project:(.+)$/.exec(card.id);
  return match?.[1] ?? null;
}

function resolvePendingTaskId(card: VibeCalibrationCard): string | null {
  const fromMeta = card.metadata.pendingTaskId;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }

  if (card.source === "generated" && card.id.trim()) {
    return card.id.trim();
  }

  return card.sourceRef?.trim() || null;
}

/**
 * Propaga el peso del voto Vibe al SSOT de origen (Project.md o PendingTask).
 * Retos laborales quedan como skipped — no hay contrato de write-back aún.
 */
export async function applyVoteToOrigin(
  card: VibeCalibrationCard,
  weight: number,
): Promise<OriginSyncResult> {
  const clamped = clampScale(weight);

  if (card.source === "generated") {
    const taskId = resolvePendingTaskId(card);
    if (!taskId) {
      return {
        kind: "failed",
        applied: false,
        weight: clamped,
        error: "No se pudo resolver la tarea pendiente de origen.",
      };
    }

    try {
      await calibratePendingTask(taskId, clamped);
      return {
        kind: "pending_task",
        applied: true,
        entityId: taskId,
        weight: clamped,
        label: card.title,
      };
    } catch (error) {
      return {
        kind: "failed",
        applied: false,
        entityId: taskId,
        weight: clamped,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la PendingTask.",
      };
    }
  }

  const kind = card.metadata.kind;
  if (kind === "laboral_challenge" || card.id.startsWith("validated:laboral:")) {
    return {
      kind: "skipped",
      applied: false,
      weight: clamped,
      label: card.title,
      error: "Retos laborales: voto registrado sin write-back de origen.",
    };
  }

  if (kind === "project" || card.id.startsWith("validated:project:")) {
    const projectId = resolveProjectId(card);
    if (!projectId) {
      return {
        kind: "failed",
        applied: false,
        weight: clamped,
        error: "No se pudo resolver el proyecto de origen.",
      };
    }

    try {
      await updateProjectPriority(projectId, clamped);
      return {
        kind: "project",
        applied: true,
        entityId: projectId,
        weight: clamped,
        label: card.title,
      };
    } catch (error) {
      return {
        kind: "failed",
        applied: false,
        entityId: projectId,
        weight: clamped,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la prioridad del proyecto.",
      };
    }
  }

  return {
    kind: "skipped",
    applied: false,
    weight: clamped,
    label: card.title,
  };
}
