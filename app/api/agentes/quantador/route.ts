import { runQuantadorPipeline, segmentarTexto } from "@/lib/agentes/quantador";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = (await request.json()) as {
      rawText?: string;
      originAttributionId?: string;
      universoSlug?: string;
      reviewId?: string;
      segmentOnly?: boolean;
    };

    if (!body.rawText?.trim()) {
      return NextResponse.json(
        { error: "Se requiere rawText." },
        { status: 400 },
      );
    }

    if (body.segmentOnly) {
      const segmented = await segmentarTexto({
        rawText: body.rawText,
        universoDefault: body.universoSlug,
      });
      return NextResponse.json(segmented);
    }

    if (!body.originAttributionId?.trim()) {
      return NextResponse.json(
        { error: "Se requiere originAttributionId para el pipeline completo." },
        { status: 400 },
      );
    }

    const result = await runQuantadorPipeline({
      rawText: body.rawText,
      originAttributionId: body.originAttributionId,
      universoSlug: body.universoSlug,
      reviewId: body.reviewId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Quantador error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo ejecutar el Quantador.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
