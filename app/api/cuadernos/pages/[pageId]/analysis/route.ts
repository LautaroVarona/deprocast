import { updatePageAnalysis } from "@/lib/cuadernos/service";
import type { PageAnalysis, PageNerEntities } from "@/lib/cuadernos/types";
import { recordFeedbackSignal } from "@/lib/ingesta/feedback";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function parseNer(raw: unknown): PageNerEntities {
  const empty: PageNerEntities = {
    persona: [],
    org: [],
    proyecto: [],
    lugar: [],
    concepto: [],
  };
  if (!raw || typeof raw !== "object") return empty;
  const record = raw as Record<string, unknown>;
  const list = (key: keyof PageNerEntities) =>
    Array.isArray(record[key])
      ? record[key].filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      : [];
  return {
    persona: list("persona"),
    org: list("org"),
    proyecto: list("proyecto"),
    lugar: list("lugar"),
    concepto: list("concepto"),
  };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ pageId: string }> },
) {
  try {
    await ensureRuntimeReady();
    const { pageId } = await context.params;
    const body = (await request.json()) as {
      suggestedTitle?: string;
      explanation?: string;
      writtenContentDescription?: string;
      semanticTags?: string[] | string;
      ner?: unknown;
      pageNumber?: number;
    };

    const semanticTags = Array.isArray(body.semanticTags)
      ? body.semanticTags.filter(
          (t): t is string => typeof t === "string" && t.trim().length > 0,
        )
      : typeof body.semanticTags === "string"
        ? body.semanticTags
            .split(/[,;]/)
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [];

    const analysis: PageAnalysis = {
      suggestedTitle: (body.suggestedTitle ?? "").trim(),
      explanation: (body.explanation ?? "").trim(),
      writtenContentDescription: (body.writtenContentDescription ?? "").trim(),
      semanticTags,
      ner: parseNer(body.ner),
      pageNumber:
        typeof body.pageNumber === "number" && body.pageNumber > 0
          ? Math.floor(body.pageNumber)
          : 1,
    };

    const page = await updatePageAnalysis(pageId, analysis);

    await recordFeedbackSignal({
      action: "page_field_saved",
      polarity: "positive",
      targetKind: "notebook_page",
      targetId: pageId,
      channel: "cuadernos",
      nextValue: analysis.suggestedTitle,
      metadata: { fields: Object.keys(body) },
      applyLearning: false,
    });

    for (const label of [
      ...analysis.ner.persona,
      ...analysis.ner.org,
      ...analysis.ner.proyecto,
      ...analysis.ner.lugar,
      ...analysis.ner.concepto,
    ]) {
      await recordFeedbackSignal({
        action: "ner_confirmed",
        polarity: "positive",
        targetKind: "field",
        fieldPath: "ner",
        channel: "cuadernos",
        nextValue: label,
        metadata: { pageId },
        applyLearning: false,
      });
    }

    return NextResponse.json({ page }, { status: 200 });
  } catch (error) {
    console.error("Cuaderno page analysis patch error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo guardar el análisis.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
