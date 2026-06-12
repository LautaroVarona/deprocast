import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
  isSourceType,
} from "@/lib/document-constants";
import { saveRawDocument } from "@/lib/documents";
import { isCampoSlug, resolveCampoSlug } from "@/lib/projects/campos";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Cuerpo de la petición inválido." },
        { status: 400 },
      );
    }

    const { title, source_type, base_weight, content, field } = body as {
      title?: unknown;
      source_type?: unknown;
      base_weight?: unknown;
      content?: unknown;
      field?: unknown;
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

    if (
      typeof base_weight !== "number" ||
      !Number.isInteger(base_weight) ||
      base_weight < MIN_BASE_WEIGHT ||
      base_weight > MAX_BASE_WEIGHT
    ) {
      return NextResponse.json(
        {
          error: `base_weight debe ser un entero entre ${MIN_BASE_WEIGHT} y ${MAX_BASE_WEIGHT}.`,
        },
        { status: 400 },
      );
    }

    if (field !== undefined && !isCampoSlug(field)) {
      return NextResponse.json({ error: "field inválido." }, { status: 400 });
    }

    const { filename } = await saveRawDocument({
      title: typeof title === "string" ? title : "",
      sourceType: source_type,
      baseWeight: base_weight,
      content,
      field: resolveCampoSlug(typeof field === "string" ? field : undefined),
    });

    return NextResponse.json({ filename }, { status: 201 });
  } catch (error) {
    console.error("Save document error:", error);
    return NextResponse.json(
      { error: "No se pudo guardar el documento." },
      { status: 500 },
    );
  }
}
