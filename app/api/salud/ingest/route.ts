import { ingestSaludMeal } from "@/lib/health/ingest-service";
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
    const occurredAtRaw = formData.get("occurredAt");
    const file = formData.get("file");

    if (modality !== "texto" && modality !== "imagen" && modality !== "audio") {
      return NextResponse.json({ error: "Modalidad inválida." }, { status: 400 });
    }

    const occurredAt =
      typeof occurredAtRaw === "string" && occurredAtRaw
        ? new Date(occurredAtRaw)
        : new Date();

    if (Number.isNaN(occurredAt.getTime())) {
      return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
    }

    let filePayload: { buffer: Buffer; filename: string; mimeType: string } | undefined;

    if (file instanceof File && file.size > 0) {
      if (modality === "imagen" && !hasExtension(file.name, IMAGE_EXT)) {
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

    if (modality !== "texto" && !filePayload) {
      return NextResponse.json(
        { error: "Se requiere archivo para esta modalidad." },
        { status: 400 },
      );
    }

    const result = await ingestSaludMeal({
      modality,
      text: typeof text === "string" ? text : undefined,
      occurredAt,
      file: filePayload,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Salud ingest error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo procesar la ingesta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
