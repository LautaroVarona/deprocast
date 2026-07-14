import { importFromUniverse, type ImportScope } from "@/lib/babel/import-service";
import { isUniverseSlug } from "@/lib/babel/context-seal";
import { ROOT_UNIVERSE_SLUG } from "@/lib/babel/constants";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const IMPORT_SCOPES: ImportScope[] = ["universe", "campo", "particula"];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    await ensureRuntimeReady();

    const { slug: targetSlug } = await context.params;
    if (!isUniverseSlug(targetSlug)) {
      return NextResponse.json({ error: "Universo destino inválido." }, { status: 400 });
    }

    if (targetSlug === ROOT_UNIVERSE_SLUG) {
      return NextResponse.json(
        { error: "Babel ya contiene todo el corpus." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      sourceSlug?: string;
      scope?: ImportScope;
      scopeRef?: string;
    };

    if (!body.sourceSlug || !isUniverseSlug(body.sourceSlug)) {
      return NextResponse.json({ error: "Universo origen inválido." }, { status: 400 });
    }

    if (!body.scope || !IMPORT_SCOPES.includes(body.scope)) {
      return NextResponse.json({ error: "Alcance de importación inválido." }, { status: 400 });
    }

    const result = await importFromUniverse({
      targetSlug,
      sourceSlug: body.sourceSlug,
      scope: body.scope,
      scopeRef: body.scopeRef,
    });

    return NextResponse.json({
      targetSlug,
      sourceSlug: body.sourceSlug,
      scope: body.scope,
      ...result,
    });
  } catch (error) {
    console.error("Universe import error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo importar el contenido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
