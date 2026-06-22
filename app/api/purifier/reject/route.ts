import { deleteReviewRecord } from "@/lib/purifier/engine";
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
    const deleted = await deleteReviewRecord(reviewId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Registro de revisión no encontrado." },
        { status: 404 },
      );
    }

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
