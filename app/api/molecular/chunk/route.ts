import { handleAudioUploadChunk } from "@/lib/audio-upload/handlers";
import { runSemanticChunker } from "@/lib/molecular-processing/semantic-chunker";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  texto: z.string().min(1, "El texto no puede estar vacío."),
  fuenteOrigen: z.string().optional(),
});

/**
 * Dual-mode canónico:
 * - multipart (campo `chunk`) → ingesta audio Local-First en data/uploads/tmp/
 * - JSON { texto } → chunkeador semántico molecular
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    try {
      return await handleAudioUploadChunk(request);
    } catch (error) {
      console.error("Molecular audio chunk error:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "No se pudo recibir el chunk de audio.",
        },
        { status: 500 },
      );
    }
  }

  try {
    const body = bodySchema.parse(await request.json());
    const result = await runSemanticChunker({
      texto: body.texto,
      fuenteOrigen: body.fuenteOrigen,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Molecular chunk error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo ejecutar el chunkeador semántico.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
