import { addNotebookPage } from "@/lib/cuadernos/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

function isAllowedImage(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
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
        { error: "Formato no soportado. Usá imágenes .png o .jpg." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
    }

    const page = await addNotebookPage(id, buffer, file.name);
    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    console.error("Cuaderno page upload error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo subir la página.";
    const status = message.includes("no encontrado") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
