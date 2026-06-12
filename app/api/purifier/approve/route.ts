import { approveAndCoagulate } from "@/lib/purifier/approve";
import { isCampoSlug } from "@/lib/projects/campos";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      reviewId?: string;
      campoSlug?: string;
      title?: string;
      markdownBody?: string;
      dimensions?: Record<string, string | number>;
      metaTagsSecundarios?: string[];
    };

    if (!body.reviewId?.trim()) {
      return NextResponse.json(
        { error: "Se requiere reviewId." },
        { status: 400 },
      );
    }

    if (!body.campoSlug || !isCampoSlug(body.campoSlug)) {
      return NextResponse.json(
        { error: "Campo de destino no válido." },
        { status: 400 },
      );
    }

    if (!body.title?.trim() || !body.markdownBody?.trim()) {
      return NextResponse.json(
        { error: "Título y cuerpo del documento son obligatorios." },
        { status: 400 },
      );
    }

    const d = body.dimensions ?? {};

    const result = await approveAndCoagulate({
      reviewId: body.reviewId.trim(),
      campoSlug: body.campoSlug,
      title: body.title.trim(),
      markdownBody: body.markdownBody,
      metaTagsSecundarios: body.metaTagsSecundarios ?? [],
      dimensions: {
        materia: String(d.materia ?? "audio/transcript"),
        particula: String(d.particula ?? body.reviewId),
        posicion: String(d.posicion ?? "observador"),
        onda: String(d.onda ?? "sin-clasificar"),
        tiempo: String(d.tiempo ?? new Date().toISOString().slice(0, 10)),
        espacio: String(d.espacio ?? "local-atanor"),
        field: String(d.field ?? body.campoSlug),
        prioridad: Number(d.prioridad) || 6,
        impacto: Number(d.impacto) || 6,
        dificultad: Number(d.dificultad) || 6,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Approve error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo aprobar y coagular el conocimiento.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
