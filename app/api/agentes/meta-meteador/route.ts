import {
  acceptMetaMeteadorTitles,
  getMetaMeteadorCoverage,
  runMetaMeteador,
  runMetaMeteadorStream,
} from "@/lib/meta-meteador/engine";
import type { MetaMeteadorStreamEvent } from "@/lib/meta-meteador/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  try {
    await ensureRuntimeReady();
    const coverage = await getMetaMeteadorCoverage();
    return NextResponse.json(coverage);
  } catch (error) {
    console.error("Meta-Meteador coverage error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo obtener la cobertura de metadatos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const stream = request.nextUrl.searchParams.get("stream") === "true";
    if (stream) {
      const encoder = new TextEncoder();
      const body = new ReadableStream({
        async start(controller) {
          const send = (event: MetaMeteadorStreamEvent) => {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          };

          try {
            for await (const event of runMetaMeteadorStream()) {
              send(event);
            }
          } catch (error) {
            console.error("Meta-Meteador stream error:", error);
            send({
              type: "error",
              documentId: "",
              oldFilename: "",
              error:
                error instanceof Error
                  ? error.message
                  : "Error inesperado en el stream.",
            });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(body, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      });
    }

    const result = await runMetaMeteador();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Meta-Meteador run error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo ejecutar Meta-Meteador.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = (await request.json()) as {
      items?: Array<{ documentId: string; title?: string }>;
    };

    if (!body.items?.length) {
      return NextResponse.json(
        { error: "Se requiere al menos un item para aceptar." },
        { status: 400 },
      );
    }

    const result = await acceptMetaMeteadorTitles(body.items);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Meta-Meteador accept error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron aplicar los títulos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
