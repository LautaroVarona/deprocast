import { processJournalForEvents } from "@/lib/events/process";
import { saveJournalEntry } from "@/lib/journal/service";
import { isJournalOnda } from "@/lib/journal/types";
import { ingestJournalFile } from "@/lib/kg/sources";
import { DEFAULT_CAMPO_SLUG } from "@/lib/projects/campos";
import { runPurificationPipeline } from "@/lib/purifier/engine";
import { resolveDataRelativePath } from "@/lib/runtime-paths";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json()) as {
      content?: string;
      onda?: string;
      purify?: boolean;
      extractKg?: boolean;
      extractEvents?: boolean;
      universeSlug?: string;
    };

    const content = body.content?.trim() ?? "";
    if (!content) {
      return NextResponse.json(
        { error: "Se requiere contenido para guardar la entrada." },
        { status: 400 },
      );
    }

    if (!isJournalOnda(body.onda)) {
      return NextResponse.json(
        { error: "Onda de diario inválida." },
        { status: 400 },
      );
    }

    const entry = await saveJournalEntry({
      content,
      onda: body.onda,
      universeSlug:
        body.universeSlug ??
        request.headers.get("x-deprocast-universe") ??
        undefined,
    });

    // Hook KG no bloqueante: ingiere la entrada del diario al grafo.
    if (body.extractKg !== false) {
      const absPath = resolveDataRelativePath(entry.relativePath);
      void ingestJournalFile(absPath).catch((error) => {
        console.error("KG journal hook error:", error);
      });
    }

    let reviewId: string | undefined;
    let validarUrl: string | undefined;
    let proposedEvents: Awaited<ReturnType<typeof processJournalForEvents>> = [];

    if (body.extractEvents !== false) {
      try {
        proposedEvents = await processJournalForEvents({
          journalId: entry.id,
          content,
          occurredAt: new Date(entry.fechaRegistro),
        });
      } catch (error) {
        console.error("Journal event extraction error:", error);
      }
    }

    void import("@/lib/listador/process").then(({ processListadorForText }) =>
      processListadorForText({
        rawText: content,
        source: "journal",
        sourceRef: entry.id,
        occurredAt: new Date(entry.fechaRegistro),
        universeSlug:
          body.universeSlug ??
          request.headers.get("x-deprocast-universe") ??
          undefined,
      }).catch((error) => {
        console.error("Listador journal hook error:", error);
      }),
    );

    if (body.purify) {
      const record = await runPurificationPipeline(
        {
          rawText: content,
          filename: entry.filename,
          metadata: {
            source: "diario",
            journalId: entry.id,
            journalPath: entry.relativePath,
          },
          gravity: {
            title: entry.title,
            campoSlug: DEFAULT_CAMPO_SLUG,
            onda: entry.onda,
            sourceType: "personal_writing",
            prioridad: 6,
            impacto: 6,
            dificultad: 6,
          },
        },
        { extractKg: body.extractKg },
      );

      reviewId = record.reviewId;
      validarUrl = `/validar?id=${record.reviewId}`;
    }

    return NextResponse.json(
      {
        entry,
        reviewId,
        validarUrl,
        proposedEvents,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Journal save error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo guardar la entrada del diario.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
