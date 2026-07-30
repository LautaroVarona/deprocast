import { handleAudioUploadInit } from "@/lib/audio-upload/handlers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Init canónico molecular para subida por chunks. */
export async function POST(request: NextRequest) {
  try {
    return await handleAudioUploadInit(request);
  } catch (error) {
    console.error("Molecular init error:", error);
    return NextResponse.json(
      { error: "No se pudo iniciar la subida molecular." },
      { status: 500 },
    );
  }
}
