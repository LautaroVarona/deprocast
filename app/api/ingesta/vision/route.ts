import {
  confirmVisionContext,
  processVisionUpload,
} from "@/lib/ingesta/vision/extract";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".heic"];

function isAllowedVisionFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        action?: string;
        projectId?: string;
        markdown?: string;
        originalFilename?: string;
        tachoPath?: string;
        mimeType?: string;
      };

      if (body.action !== "confirm") {
        return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
      }

      if (!body.projectId?.trim()) {
        return NextResponse.json(
          { error: "Seleccioná un proyecto de destino." },
          { status: 400 },
        );
      }

      if (!body.markdown?.trim()) {
        return NextResponse.json(
          { error: "No hay contenido purificado para confirmar." },
          { status: 400 },
        );
      }

      const result = await confirmVisionContext({
        projectId: body.projectId.trim(),
        markdown: body.markdown,
        originalFilename: String(body.originalFilename ?? "documento"),
        tachoPath: String(body.tachoPath ?? ""),
        mimeType: String(body.mimeType ?? "application/octet-stream"),
      });

      return NextResponse.json(result, { status: 201 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

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
            "Formato no soportado. Usá imágenes (.png, .jpg, .webp) o PDF.",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length === 0) {
      return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
    }

    const result = await processVisionUpload(buffer, file.name);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Vision ingest error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo procesar el documento visual.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
