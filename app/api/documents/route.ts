import { isSourceType } from "@/lib/document-constants";
import { captureAndPurify } from "@/lib/purifier/capture";
import { isCampoSlug, resolveCampoSlug } from "@/lib/projects/campos";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Cuerpo de la petición inválido." },
        { status: 400 },
      );
    }

    const { title, source_type, content, field, onda } = body as {
      title?: unknown;
      source_type?: unknown;
      content?: unknown;
      field?: unknown;
      onda?: unknown;
    };

    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "El contenido no puede estar vacío." },
        { status: 400 },
      );
    }

    if (!isSourceType(source_type)) {
      return NextResponse.json(
        { error: "source_type inválido." },
        { status: 400 },
      );
    }

    if (field !== undefined && !isCampoSlug(field)) {
      return NextResponse.json({ error: "field inválido." }, { status: 400 });
    }

    const result = await captureAndPurify({
      channel: "texto",
      rawText: content,
      gravity: {
        title: typeof title === "string" ? title : undefined,
        campoSlug: resolveCampoSlug(typeof field === "string" ? field : undefined),
        sourceType: source_type,
        onda: typeof onda === "string" ? onda : undefined,
      },
    });

    return NextResponse.json(
      {
        reviewId: result.reviewId,
        captureId: result.captureId,
        particula: result.particula,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Save document error:", error);
    return NextResponse.json(
      { error: "No se pudo capturar el documento." },
      { status: 500 },
    );
  }
}
