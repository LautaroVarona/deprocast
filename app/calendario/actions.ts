"use server";

import { ImmutableCollisionError } from "@/lib/calendario/collision";
import { coagulateMissionCard } from "@/lib/calendario/coagulate";
import {
  coagulateInputSchema,
  type CoagulateResult,
  type MissionCardSource,
} from "@/lib/calendario/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { ZodError } from "zod";

export type CoagulateTaskToTimeInput = {
  taskId: string;
  cardSource: MissionCardSource;
  targetDate: string | Date;
  durationMin?: number;
  ecosystemArea?: string;
};

export type CoagulateTaskToTimeResult =
  | { ok: true; result: CoagulateResult }
  | {
      ok: false;
      error: string;
      collision?: { blockTitle: string; blockId: string };
    };

/**
 * Coagula una carta de misión (PendingTask / LudusMicrotask / evento propuesto)
 * en un hueco concreto del Tablero del Tiempo.
 */
export async function coagulateTaskToTime(
  raw: CoagulateTaskToTimeInput,
): Promise<CoagulateTaskToTimeResult> {
  try {
    await ensureRuntimeReady();
    const input = coagulateInputSchema.parse({
      cardSource: raw.cardSource,
      cardId: raw.taskId,
      occurredAt: raw.targetDate,
      durationMin: raw.durationMin,
      ecosystemArea: raw.ecosystemArea,
    });
    const result = await coagulateMissionCard(input);
    return { ok: true, result };
  } catch (error) {
    if (error instanceof ImmutableCollisionError) {
      return {
        ok: false,
        error: error.message,
        collision: { blockTitle: error.blockTitle, blockId: error.blockId },
      };
    }
    if (error instanceof ZodError) {
      return {
        ok: false,
        error: error.issues[0]?.message ?? "Payload de coagulación inválido.",
      };
    }
    const message =
      error instanceof Error ? error.message : "No se pudo coagular la misión.";
    return { ok: false, error: message };
  }
}
