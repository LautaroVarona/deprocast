import { handleAudioUploadComplete } from "@/lib/audio-upload/handlers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Consolidación molecular de audio: reensambla chunks y dispara STT. */
export async function POST(request: NextRequest) {
  try {
    return await handleAudioUploadComplete(request);
  } catch (error) {
    console.error("Molecular complete error:", error);
    return NextResponse.json(
      { error: "No se pudo completar la consolidación molecular." },
      { status: 500 },
    );
  }
}
