import { getArchivoItem } from "@/lib/archivo";
import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { filterArchivoItemsForUniverse } from "@/lib/babel/universe-refs";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const decodedId = decodeURIComponent(id);
    const universeSlug = getUniverseFilterSlugFromRequest(request);

    const item = await getArchivoItem(decodedId);
    if (!item) {
      return NextResponse.json(
        { error: "Documento no encontrado en el archivo." },
        { status: 404 },
      );
    }

    const [allowed] = await filterArchivoItemsForUniverse(
      [{ id: item.id }],
      universeSlug,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Documento no pertenece al universo activo." },
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
