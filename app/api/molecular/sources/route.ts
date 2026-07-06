import { listArchivoItems } from "@/lib/archivo";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();

    const { items, total } = await listArchivoItems();
    const sources = items.map((item) => ({
      id: item.id,
      title: item.title,
      kind: item.kind,
      fuenteOrigen: item.fuenteOrigen,
      charCount: item.charCount,
      createdAt: item.createdAt,
      strongestTag: item.strongestTag,
    }));

    return NextResponse.json({ sources, total });
  } catch (error) {
    console.error("Molecular sources error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar las fuentes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
