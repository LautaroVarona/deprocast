import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * STT desde buffer en memoria → Transcript en Prisma.
 * Usado en Vercel (sin depender del FS durable ni de la cola entre cold starts).
 */
export async function persistTranscriptFromBuffer(
  assetId: string,
  buffer: Buffer,
): Promise<{ rawText: string; confidence: number | null }> {
  const { transcribeBuffer } = await import("@/lib/deepgram/transcribe-sync");
  const result = await transcribeBuffer(assetId, buffer);
  const rawText = result.rawText?.trim() ?? "";

  if (!rawText) {
    throw new Error("Deepgram devolvió transcripción vacía.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.transcript.deleteMany({ where: { assetId } });
    await tx.transcript.create({
      data: {
        assetId,
        rawText,
        confidence: result.confidence ?? null,
      },
    });
    await tx.audioAsset.update({
      where: { id: assetId },
      data: {
        status: "COMPLETED",
        partialText: null,
        pipelineStation: "STT",
        pipelineError: null,
      },
    });
  });

  return { rawText, confidence: result.confidence ?? null };
}

export function isPrismaSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  if (code === "P2021" || code === "P2022") return true;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("does not exist") ||
    message.includes("TableDoesNotExist") ||
    message.includes("no such table")
  );
}
