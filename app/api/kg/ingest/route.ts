import { ingestKgExtraction } from "@/lib/kg/ingest";
import type { LlmKgExtraction } from "@/lib/kg/types";
import { isMentionSourceType } from "@/lib/kg/types";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      extraction?: LlmKgExtraction;
      sourceType?: string;
      sourceId?: string;
      sourceMetadata?: Record<string, unknown>;
    };

    if (!body.extraction?.entities || !Array.isArray(body.extraction.entities)) {
      return NextResponse.json(
        { error: "Se requiere extraction.entities válido." },
        { status: 400 },
      );
    }

    if (!body.sourceType || !isMentionSourceType(body.sourceType)) {
      return NextResponse.json(
        { error: "sourceType inválido." },
        { status: 400 },
      );
    }

    const sourceId = body.sourceId?.trim();
    if (!sourceId) {
      return NextResponse.json(
        { error: "Se requiere sourceId." },
        { status: 400 },
      );
    }

    const result = await ingestKgExtraction({
      extraction: {
        entities: body.extraction.entities,
        relations: body.extraction.relations ?? [],
      },
      source: {
        type: body.sourceType,
        id: sourceId,
        metadata: body.sourceMetadata,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("KG ingest error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo ingerir el grafo de conocimiento.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
