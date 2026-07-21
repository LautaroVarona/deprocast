import { z } from "zod";
import {
  BLOCK_KINDS,
  ECOSYSTEM_AREAS,
  EXECUTION_STATUSES,
  MISSION_CARD_SOURCES,
  type BlockKind,
  type EcosystemArea,
  type ExecutionStatus,
  type MissionCardSource,
} from "@/lib/calendario/constants";

export type { BlockKind, EcosystemArea, ExecutionStatus, MissionCardSource };

export const missionCardSchema = z.object({
  id: z.string(),
  source: z.enum(MISSION_CARD_SOURCES),
  sourceId: z.string(),
  title: z.string(),
  actionCost: z.number().int().min(1).max(12),
  durationMin: z.number().int().min(1).max(480),
  ecosystemArea: z.enum(ECOSYSTEM_AREAS).nullable(),
  blockKind: z.literal("SUGGESTION"),
});

export type MissionCardDto = z.infer<typeof missionCardSchema>;

export const coagulateInputSchema = z.object({
  cardSource: z.enum(MISSION_CARD_SOURCES),
  cardId: z.string().min(1),
  occurredAt: z.coerce.date(),
  durationMin: z.number().int().min(5).max(480).optional(),
  ecosystemArea: z.enum(ECOSYSTEM_AREAS).optional(),
});

export type CoagulateInput = z.infer<typeof coagulateInputSchema>;

export type CoagulateResult = {
  eventId: string;
  occurredAt: string;
  endsAt: string | null;
  executionStatus: ExecutionStatus;
  signalPreview: number;
};

export const patchBlockExecutionSchema = z.object({
  executionStatus: z.enum(EXECUTION_STATUSES),
});

export type PatchBlockExecutionInput = z.infer<typeof patchBlockExecutionSchema>;

export const deckQuerySchema = z.object({
  area: z.enum(ECOSYSTEM_AREAS).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
