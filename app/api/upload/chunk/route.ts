import { handleAudioUploadChunk } from "@/lib/audio-upload/handlers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    return await handleAudioUploadChunk(request);
  } catch (error) {
    console.error("Upload chunk error:", error);
    return NextResponse.json(
      { error: "No se pudo recibir el chunk." },
      { status: 500 },
    );
  }
}
