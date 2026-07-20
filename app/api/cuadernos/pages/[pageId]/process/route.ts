import {
  getPageById,
  markPageError,
  markPageProcessing,
  savePageVisionResult,
} from "@/lib/cuadernos/service";
import { runAtomicVisionAgent } from "@/lib/cuadernos/vision-agent";
import { logNotebookProcessedActivity } from "@/lib/historial/domain-log";
import {
  aiAgentActor,
  buildOriginAttribution,
  selfActor,
} from "@/lib/ingesta/origin";
import { indexNotebookPageMemory } from "@/lib/mnemosyne/hooks";
import { captureAndPurify } from "@/lib/purifier/capture";
import { prisma } from "@/lib/prisma";
import { getDataRoot } from "@/lib/runtime-paths";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ pageId: string }> },
) {
  try {
    await ensureRuntimeReady();
    const { pageId } = await context.params;

    const page = await getPageById(pageId);
    if (!page) {
      return NextResponse.json({ error: "Página no encontrada." }, { status: 404 });
    }

    if (page.status === "PROCESSING") {
      return NextResponse.json(
        { error: "La página ya está en procesamiento." },
        { status: 409 },
      );
    }

    await markPageProcessing(pageId);

    const normalized = page.imagePath.replace(/^data[\\/]/, "");
    const absolutePath = path.join(getDataRoot(), normalized.replace(/^data[\\/]/, ""));
    const buffer = await readFile(absolutePath);

    const vision = await runAtomicVisionAgent({
      buffer,
      mimeType: page.mimeType,
      pageNumberHint: page.pageNumber,
    });

    let corpusCaptureId: string | undefined;

    if (vision.semanticVector.trim()) {
      const capture = await captureAndPurify({
        channel: "vision",
        rawText: vision.semanticVector,
        filename: page.filename,
        metadata: {
          notebookPageId: pageId,
          notebookId: page.notebookId,
          pageNumber: String(page.pageNumber),
          channel: "cuadernos",
        },
        gravity: {
          title:
            vision.pageAnalysis.suggestedTitle ||
            `Cuaderno p.${page.pageNumber}`,
          sourceType: "personal_writing",
        },
        origin: buildOriginAttribution({
          channel: "cuadernos",
          actors: [
            selfActor(),
            aiAgentActor("vision-atomica", "cuadernos-vision"),
          ],
          meta: {
            notebookPageId: pageId,
            pageNumber: page.pageNumber,
          },
        }),
      });
      corpusCaptureId = capture.captureId;
    }

    const updated = await savePageVisionResult(pageId, {
      ...vision,
      corpusCaptureId,
    });

    const notebook = await prisma.notebook.findUnique({
      where: { id: page.notebookId },
      select: { title: true },
    });

    void logNotebookProcessedActivity({
      pageId,
      notebookId: page.notebookId,
      notebookTitle: notebook?.title ?? "Cuaderno",
      pageNumber: page.pageNumber,
      semanticPreview: vision.semanticVector,
      corpusCaptureId,
      quantaCount: vision.quanta.length,
    }).catch((error) => {
      console.error("Historial notebook process log error:", error);
    });

    void indexNotebookPageMemory({
      pageId,
      notebookTitle: notebook?.title ?? "Cuaderno",
      pageNumber: page.pageNumber,
      semanticVector: vision.semanticVector,
      structuralNotes: vision.structuralVector.rawNotes,
    }).catch((error) => {
      console.error("Mnemosyne notebook page index error:", error);
    });

    return NextResponse.json({ page: updated }, { status: 200 });
  } catch (error) {
    console.error("Cuaderno page process error:", error);
    const { pageId } = await context.params;
    await markPageError(pageId).catch(() => undefined);

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo procesar la página con el Agente de Visión.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
