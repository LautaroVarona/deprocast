import { injectToDeprocast } from "@/lib/cam-recorder-watcher/store";
import { clampFocus } from "@/lib/cam-recorder-watcher/utils";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const noteSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().min(1),
  timestampSeconds: z.number().nonnegative(),
  appActiva: z.string().min(1),
  descripcionDetallada: z.string().min(1),
  nivelDeFoco: z.number().int().min(1).max(12),
});

const bodySchema = z.object({
  sessionId: z.string().min(1),
  videoFilename: z.string().min(1),
  videoDurationSeconds: z.number().positive(),
  notas: z.array(noteSchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = bodySchema.parse(await request.json());

    const notas = body.notas.map((note) => ({
      ...note,
      nivelDeFoco: clampFocus(note.nivelDeFoco),
    }));

    const result = await injectToDeprocast({
      sessionId: body.sessionId,
      videoFilename: body.videoFilename,
      videoDurationSeconds: body.videoDurationSeconds,
      notas,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Cam-Recorder inject error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo inyectar el bloque a Deprocast.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
