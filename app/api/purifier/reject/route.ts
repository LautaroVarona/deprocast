import { deleteReviewRecord, loadReviewRecord } from "@/lib/purifier/engine";
import { logRejectedActivity } from "@/lib/historial/pipeline-log";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = (await request.json()) as { reviewId?: string };

    if (!body.reviewId?.trim()) {
      return NextResponse.json(
        { error: "Se requiere reviewId." },
        { status: 400 },
      );
    }

    const reviewId = body.reviewId.trim();
    const loaded = await loadReviewRecord(reviewId);
    const deleted = await deleteReviewRecord(reviewId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Registro de revisión no encontrado." },
        { status: 404 },
      );
    }

    void logRejectedActivity({
      reviewId,
      title: loaded?.record.suggestedDimensions?.title ?? loaded?.record.source.filename,
    }).catch((error) => {
      console.error("Historial reject log error:", error);
    });

    return NextResponse.json({
      reviewId,
      message: "Validación rechazada y eliminada.",
    });
  } catch (error) {
    console.error("Reject error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo rechazar la validación.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
