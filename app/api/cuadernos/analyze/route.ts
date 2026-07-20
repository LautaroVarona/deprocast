import { getPageById } from "@/lib/cuadernos/service";
import { runAtomicVisionAgent } from "@/lib/cuadernos/vision-agent";
import { getDataRoot } from "@/lib/runtime-paths";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Alias ligero del Agente de Visión Atómica.
 * Acepta `pageId` (recomendado) o multipart `file` + `pageNumber` opcional.
 * No persiste: para guardar usá POST /api/cuadernos/pages/[pageId]/process.
 */
export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const rawPageNumber = formData.get("pageNumber");
      const pageNumberHint =
        typeof rawPageNumber === "string" && /^\d+$/.test(rawPageNumber.trim())
          ? parseInt(rawPageNumber.trim(), 10)
          : undefined;

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Se requiere 'file' o 'pageId'." },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || "image/jpeg";
      const analysis = await runAtomicVisionAgent({
        buffer,
        mimeType,
        pageNumberHint,
      });

      return NextResponse.json({ analysis }, { status: 200 });
    }

    const body = (await request.json().catch(() => null)) as {
      pageId?: string;
      pageNumber?: number;
    } | null;

    if (!body?.pageId) {
      return NextResponse.json(
        { error: "Se requiere pageId (JSON) o file (multipart)." },
        { status: 400 },
      );
    }

    const page = await getPageById(body.pageId);
    if (!page) {
      return NextResponse.json({ error: "Página no encontrada." }, { status: 404 });
    }

    const normalized = page.imagePath.replace(/^data[\\/]/, "");
    const absolutePath = path.join(
      getDataRoot(),
      normalized.replace(/^data[\\/]/, ""),
    );
    const buffer = await readFile(absolutePath);
    const analysis = await runAtomicVisionAgent({
      buffer,
      mimeType: page.mimeType,
      pageNumberHint: body.pageNumber ?? page.pageNumber,
    });

    return NextResponse.json({ analysis, pageId: page.id }, { status: 200 });
  } catch (error) {
    console.error("Cuadernos analyze error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo analizar la página.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
