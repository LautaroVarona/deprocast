import { isCampoSlug, type CampoSlug } from "@/lib/projects/campos";
import { tableBufferToRawText } from "@/lib/ingesta/tablas/to-raw-text";
import { captureAndPurify } from "@/lib/purifier/capture";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const ALLOWED_EXTENSIONS = [".csv", ".tsv", ".txt", ".xlsx", ".xls"];

function isAllowedTableFile(filename: string): boolean {
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

    if (!isAllowedTableFile(file.name)) {
      return NextResponse.json(
        { error: "Formato no soportado. Usá .csv, .tsv, .xlsx o .xls." },
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

    const rawText = await tableBufferToRawText(buffer, file.name);
    const result = await captureAndPurify({
      channel: "tablas",
      rawText,
      filename: file.name,
      gravity: { campoSlug },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Table ingest error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo capturar la tabla.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
