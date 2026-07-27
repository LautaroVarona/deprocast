import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import {
  importPersonasFromProsopografo,
  previewProsopografoPersonas,
} from "@/lib/personas/prosopografo/import";
import { parsePersonaImportPayload } from "@/lib/personas/prosopografo/parse";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json()) as {
      json?: string | unknown;
      dryRun?: boolean;
    };

    if (body.json === undefined || body.json === null) {
      return NextResponse.json(
        { error: "Falta el campo json (string u objeto)." },
        { status: 400 },
      );
    }

    const parsed = parsePersonaImportPayload(body.json);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const universeSlug =
      getUniverseFilterSlugFromRequest(request) ?? undefined;

    if (body.dryRun) {
      const preview = await previewProsopografoPersonas(parsed.personas);
      return NextResponse.json({
        dryRun: true,
        count: preview.length,
        preview,
      });
    }

    const result = await importPersonasFromProsopografo(
      parsed.personas,
      universeSlug,
    );

    const status =
      result.created.length === 0
        ? 400
        : result.errors.length > 0
          ? 207
          : 201;

    return NextResponse.json(
      {
        personas: result.created,
        created: result.created.length,
        errors: result.errors,
        warnings: result.warnings,
      },
      { status },
    );
  } catch (error) {
    console.error("Prosopógrafo import error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo importar el JSON de personas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
