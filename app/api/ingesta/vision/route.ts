import { processVisionUpload } from "@/lib/ingesta/vision/extract";
import { captureAndPurify } from "@/lib/purifier/capture";
import { isCampoSlug, type CampoSlug } from "@/lib/projects/campos";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic"];

function isAllowedVisionFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const rawCampo = formData.get("campoSlug");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Se requiere un archivo en el campo 'file'." },
        { status: 400 },
      );
    }

    if (!isAllowedVisionFile(file.name)) {
      return NextResponse.json(
        {
          error:
            "Formato no soportado. Usá imágenes (.png, .jpg, .webp, .gif, .heic).",
        },
        { status: 400 },
      );
    }

    let campoSlug: CampoSlug | undefined;
    if (typeof rawCampo === "string" && rawCampo.trim()) {
      const trimmedCampo = rawCampo.trim();
      if (!isCampoSlug(trimmedCampo)) {
        return NextResponse.json(
          { error: "El Campo seleccionado no es válido." },
          { status: 400 },
        );
      }
      campoSlug = trimmedCampo;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length === 0) {
      return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
    }

    const extracted = await processVisionUpload(buffer, file.name);
    const result = await captureAndPurify({
      channel: "vision",
      rawText: extracted.markdown,
      filename: file.name,
      metadata: {
        tachoPath: extracted.tachoPath,
        mimeType: extracted.mimeType,
      },
      gravity: { campoSlug },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Vision ingest error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo capturar el documento visual.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
