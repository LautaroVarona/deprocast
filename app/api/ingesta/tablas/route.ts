import { isCampoSlug, type CampoSlug } from "@/lib/projects/campos";
import { importStructuredTable } from "@/lib/ingesta/tablas/import";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

    let campoSlug: CampoSlug | null = null;
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

    const result = await importStructuredTable({
      buffer,
      filename: file.name,
      campoSlug,
    });

    if (result.imported === 0 && result.totalRows > 0) {
      return NextResponse.json(
        {
          error: "No se pudo estructurar ningún proyecto desde la tabla.",
          details: result.errors,
          ...result,
        },
        { status: 422 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Table ingest error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo procesar la tabla estructurada.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
