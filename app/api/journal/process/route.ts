import { processJournalForEvents } from "@/lib/events/process";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json()) as {
      journalId?: string;
      content?: string;
      occurredAt?: string;
    };

    const journalId = body.journalId?.trim();
    const content = body.content?.trim();

    if (!journalId || !content) {
      return NextResponse.json(
        { error: "journalId y content son obligatorios." },
        { status: 400 },
      );
    }

    const occurredAt = body.occurredAt
      ? new Date(body.occurredAt)
      : new Date();

    const events = await processJournalForEvents({
      journalId,
      content,
      occurredAt,
    });

    return NextResponse.json({ events, correlationId: events[0]?.correlationId ?? null });
  } catch (error) {
    console.error("Journal process error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo procesar la entrada del diario.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
