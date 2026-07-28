import { extractHermeneutaFromImage } from "@/lib/hermeneuta/extract";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic"];

function isAllowedImage(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Atanor Visual — propone Vector Semántico + Estructural.
 * NO escribe en SQLite. Persistencia solo vía /api/hermeneuta/coagulate.
 */
export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Se requiere un archivo en el campo 'file'." },
        { status: 400 },
      );
    }

    if (!isAllowedImage(file.name)) {
      return NextResponse.json(
        {
          error:
            "Formato no soportado. Usá imágenes (.png, .jpg, .webp, .gif, .heic).",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
    }

    const result = await extractHermeneutaFromImage({
      buffer,
      originalFilename: file.name,
      mimeType: file.type || null,
    });

    return NextResponse.json(
      {
        semanticText: result.semanticText,
        structuralNodes: result.structuralNodes,
        structuralEdges: result.structuralEdges,
        mimeType: result.mimeType,
        originalFilename: result.originalFilename,
        modelUsed: result.modelUsed,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Hermeneuta extract error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo calentar el Atanor visual.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
