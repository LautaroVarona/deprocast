import "server-only";

import { prisma } from "@/lib/prisma";
import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";
import { normalizeKgEdgeWeight } from "@/lib/validations/kg-schema";

export const FEEDBACK_ACTIONS = [
  "speaker_renamed",
  "entity_confirmed",
  "tag_edited",
  "field_corrected",
  "weight_calibrated",
  "ner_confirmed",
  "page_field_saved",
] as const;

export type FeedbackAction = (typeof FEEDBACK_ACTIONS)[number];

export type FeedbackPolarity = "positive" | "negative" | "neutral";

export type FeedbackTargetKind =
  | "kg_node"
  | "kg_edge"
  | "notebook_page"
  | "x_bookmark"
  | "audio_asset"
  | "field";

export type RecordFeedbackInput = {
  action: FeedbackAction | string;
  polarity?: FeedbackPolarity;
  targetKind: FeedbackTargetKind;
  targetId?: string;
  fieldPath?: string;
  previousValue?: string;
  nextValue?: string;
  channel?: string;
  metadata?: Record<string, unknown>;
  /** Si true (default en positive), refuerza confidence/weight en SQLite. */
  applyLearning?: boolean;
};

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function reinforceConfidence(current: number): number {
  return clampConfidence(current + (1 - current) * 0.25);
}

async function applyPositiveLearning(
  input: RecordFeedbackInput,
): Promise<void> {
  if (!input.targetId) return;

  if (input.targetKind === "kg_node") {
    const node = await prisma.kgNode.findUnique({
      where: { id: input.targetId },
      select: { id: true, confidence: true },
    });
    if (!node) return;
    await prisma.kgNode.update({
      where: { id: node.id },
      data: { confidence: reinforceConfidence(node.confidence) },
    });
    return;
  }

  if (input.targetKind === "kg_edge") {
    const edge = await prisma.kgEdge.findUnique({
      where: { id: input.targetId },
      select: { id: true, weight: true, confidence: true },
    });
    if (!edge) return;

    const nextWeight = normalizeKgEdgeWeight(
      (edge.weight ?? 6) + 1,
    ).weight;
    // Si ya está en 12, normalize mantiene 12; también subimos confidence.
    const capped =
      edge.weight !== null && edge.weight >= MAX_BASE_WEIGHT
        ? MAX_BASE_WEIGHT
        : Math.max(MIN_BASE_WEIGHT, nextWeight);

    await prisma.kgEdge.update({
      where: { id: edge.id },
      data: {
        weight: capped,
        confidence: reinforceConfidence(edge.confidence),
      },
    });
  }
}

export async function recordFeedbackSignal(
  input: RecordFeedbackInput,
): Promise<{ id: string }> {
  const polarity = input.polarity ?? "positive";

  const signal = await prisma.feedbackSignal.create({
    data: {
      action: input.action,
      polarity,
      targetKind: input.targetKind,
      targetId: input.targetId ?? null,
      fieldPath: input.fieldPath ?? null,
      previousValue: input.previousValue ?? null,
      nextValue: input.nextValue ?? null,
      channel: input.channel ?? null,
      metadata: (input.metadata ?? {}) as object,
    },
  });

  const shouldLearn =
    input.applyLearning !== false && polarity === "positive";

  if (shouldLearn) {
    await applyPositiveLearning(input);
  }

  return { id: signal.id };
}
