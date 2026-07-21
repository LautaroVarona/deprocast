import { ingestFinancialDraft } from "@/lib/finanzas/broker-multimodal";
import { createPendingTransaction } from "@/lib/finanzas/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic"];
const AUDIO_EXT = [".webm", ".ogg", ".m4a", ".mp3", ".wav", ".mp4"];

function hasExtension(filename: string, list: string[]): boolean {
  const lower = filename.toLowerCase();
  return list.some((ext) => lower.endsWith(ext));
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const formData = await request.formData();
    const modality = formData.get("modality");
    const text = formData.get("text");
    const file = formData.get("file");

    if (modality !== "text" && modality !== "image" && modality !== "audio") {
      return NextResponse.json({ error: "Modalidad inválida." }, { status: 400 });
    }

    let filePayload: { buffer: Buffer; filename: string; mimeType: string } | undefined;

    if (file instanceof File && file.size > 0) {
      if (modality === "image" && !hasExtension(file.name, IMAGE_EXT)) {
        return NextResponse.json(
          { error: "Imagen no soportada." },
          { status: 400 },
        );
      }
      if (modality === "audio" && !hasExtension(file.name, AUDIO_EXT)) {
        return NextResponse.json(
          { error: "Audio no soportado." },
          { status: 400 },
        );
      }

      filePayload = {
        buffer: Buffer.from(await file.arrayBuffer()),
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
      };
    }

    if (modality !== "text" && !filePayload) {
      return NextResponse.json(
        { error: "Se requiere archivo para esta modalidad." },
        { status: 400 },
      );
    }

    const { draft, sourceRaw, sourceChannel } = await ingestFinancialDraft({
      modality,
      text: typeof text === "string" ? text : undefined,
      file: filePayload,
    });

    const transaction = await createPendingTransaction({
      draft,
      sourceChannel,
      sourceRaw,
    });

    return NextResponse.json({ transaction, draft }, { status: 201 });
  } catch (error) {
    console.error("Finanzas ingest error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo procesar la ingesta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
