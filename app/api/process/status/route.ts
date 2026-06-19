import { processingQueue } from "@/lib/processing-queue";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();

    const status = await processingQueue.getStatusWithActive();

    return NextResponse.json(status);
  } catch (error) {
    console.error("Process status error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo obtener el estado de procesamiento.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
