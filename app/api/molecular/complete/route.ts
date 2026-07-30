import { handleAudioUploadComplete } from "@/lib/audio-upload/handlers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
/** STT in-process en Vercel puede superar 2 min. */
export const maxDuration = 300;

/** Consolidación molecular de audio: reensambla chunks y dispara STT. */
export async function POST(request: NextRequest) {
  try {
    return await handleAudioUploadComplete(request);
  } catch (error) {
    console.error("Molecular complete error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar la consolidación molecular.";
    // 200 estructurado: evita Error Boundary / UI en blanco por 500 bruto.
    return NextResponse.json(
      {
        error: message,
        ok: false,
        pipelineStation: "ERROR",
      },
      { status: 200 },
    );
  }
}
