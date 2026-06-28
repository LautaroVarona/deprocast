import { streamConsciousnessNotes } from "@/lib/cam-recorder-watcher/watcher";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  filename: z.string().min(1),
  durationSeconds: z.number().positive().max(86_400),
  fileSizeBytes: z.number().int().nonnegative().optional(),
  stream: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());

    if (body.stream) {
      const encoder = new TextEncoder();
      const sessionId = `session-${Date.now().toString(36)}`;

      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({ type: "session", sessionId })}\n`,
            ),
          );

          for await (const note of streamConsciousnessNotes(
            body.durationSeconds,
          )) {
            controller.enqueue(
              encoder.encode(`${JSON.stringify({ type: "note", note })}\n`),
            );
          }

          controller.enqueue(
            encoder.encode(`${JSON.stringify({ type: "done" })}\n`),
          );
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-store",
        },
      });
    }

    const { runCamRecorderWatcher } = await import(
      "@/lib/cam-recorder-watcher/watcher"
    );
    const result = await runCamRecorderWatcher(body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Cam-Recorder analyze error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo analizar la grabación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
