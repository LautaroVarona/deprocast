import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";
import { recordCalibrationVote } from "@/lib/vibe-calibrator/persist";
import { clampScale } from "@/lib/projects/priority";
import type {
  CalibratorCardSource,
  VibeCalibrationCard,
} from "@/lib/vibe-calibrator/types";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isValidVoteBody(body: unknown): body is {
  sessionId: string;
  cardId: string;
  weight: number;
  cardSource: CalibratorCardSource;
  sourceRef?: string;
  title?: string;
  metadata?: Record<string, unknown>;
} {
  if (!body || typeof body !== "object") return false;
  const record = body as Record<string, unknown>;
  return (
    typeof record.sessionId === "string" &&
    record.sessionId.trim().length > 0 &&
    typeof record.cardId === "string" &&
    record.cardId.trim().length > 0 &&
    typeof record.weight === "number" &&
    record.weight >= MIN_BASE_WEIGHT &&
    record.weight <= MAX_BASE_WEIGHT &&
    (record.cardSource === "validated" || record.cardSource === "generated")
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!isValidVoteBody(body)) {
      return NextResponse.json(
        { error: "Payload de voto inválido." },
        { status: 400 },
      );
    }

    const weight = clampScale(body.weight);
    const card: VibeCalibrationCard = {
      id: body.cardId,
      title: body.title ?? body.cardId,
      description: "",
      source: body.cardSource,
      sourceRef: body.sourceRef,
      metadata: body.metadata ?? {},
    };

    const vote = await recordCalibrationVote({
      sessionId: body.sessionId.trim(),
      card,
      weight,
    });

    return NextResponse.json(
      {
        vote: {
          id: vote.id,
          cardId: vote.cardId,
          weight: vote.weight,
          timestamp: vote.votedAt.toISOString(),
          metadata: vote.metadata,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Vibe calibrator vote error:", error);
    return NextResponse.json(
      { error: "No se pudo registrar el voto." },
      { status: 500 },
    );
  }
}
