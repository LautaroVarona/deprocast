import { prisma } from "@/lib/prisma";
import { logVibeCalibratedActivity } from "@/lib/historial/domain-log";
import { clampScale } from "@/lib/projects/priority";
import type {
  CalibratorQueueConfig,
  VibeCalibrationCard,
} from "./types";

export async function createCalibrationSession(
  config: CalibratorQueueConfig,
): Promise<{ sessionId: string }> {
  const session = await prisma.vibeCalibrationSession.create({
    data: {
      config: config as object,
    },
  });

  return { sessionId: session.id };
}

export async function recordCalibrationVote(input: {
  sessionId: string;
  card: VibeCalibrationCard;
  weight: number;
  metadata?: Record<string, unknown>;
}) {
  const weight = clampScale(input.weight);

  return prisma.vibeCalibrationVote.create({
    data: {
      sessionId: input.sessionId,
      cardId: input.card.id,
      cardSource: input.card.source,
      sourceRef: input.card.sourceRef,
      weight,
      metadata: {
        title: input.card.title,
        ...input.card.metadata,
        ...input.metadata,
      } as object,
    },
  });
}

export async function completeCalibrationSession(sessionId: string) {
  const session = await prisma.vibeCalibrationSession.update({
    where: { id: sessionId },
    data: { completedAt: new Date() },
    include: {
      votes: true,
    },
  });

  const config = session.config as CalibratorQueueConfig;
  void logVibeCalibratedActivity({
    sessionId: session.id,
    config,
    voteCount: session.votes.length,
    completedAt: session.completedAt ?? new Date(),
  }).catch((error) => {
    console.error("Historial vibe calibrate log error:", error);
  });

  return session;
}

export async function getCalibrationSession(sessionId: string) {
  return prisma.vibeCalibrationSession.findUnique({
    where: { id: sessionId },
    include: {
      votes: {
        orderBy: { votedAt: "desc" },
      },
    },
  });
}
