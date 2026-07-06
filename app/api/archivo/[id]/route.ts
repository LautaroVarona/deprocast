import { getArchivoItem } from "@/lib/archivo";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const decodedId = decodeURIComponent(id);

    const item = await getArchivoItem(decodedId);
    if (!item) {
      return NextResponse.json(
        { error: "Documento no encontrado en el archivo." },
        { status: 404 },
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Archivo detail error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el documento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
