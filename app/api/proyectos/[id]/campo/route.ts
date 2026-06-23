import { isCampoSlug } from "@/lib/projects/campos";
import { assignProjectToCampo } from "@/lib/projects/service";
import { ingestSingleProject } from "@/lib/kg/sources";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await ensureRuntimeReady();

    const { id } = await context.params;
    const body = (await request.json()) as { campoSlug?: string };

    if (!body.campoSlug || !isCampoSlug(body.campoSlug)) {
      return NextResponse.json(
        { error: "Seleccioná un Campo válido para el proyecto." },
        { status: 400 },
      );
    }

    const project = await assignProjectToCampo(id, body.campoSlug);

    void ingestSingleProject(project, { force: true }).catch((error) => {
      console.error("KG project campo hook error:", error);
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Assign project campo error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo reasignar el proyecto al Campo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
