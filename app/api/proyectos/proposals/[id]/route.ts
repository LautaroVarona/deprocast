import { getProposal, updateProposalValidation } from "@/lib/projects/proposal-store";
import { isCampoSlug } from "@/lib/projects/campos";
import { PROJECT_TIPOS, type ProjectTipo } from "@/lib/projects/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function parseTipo(value: unknown): ProjectTipo | undefined {
  const tipo = String(value ?? "");
  return PROJECT_TIPOS.includes(tipo as ProjectTipo) ? (tipo as ProjectTipo) : undefined;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const proposal = await getProposal(id);

    if (!proposal) {
      return NextResponse.json({ error: "Propuesta no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ proposal });
  } catch (error) {
    console.error("Get proposal error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo cargar la propuesta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const body = (await request.json()) as {
      mvp?: string;
      firstStep?: string;
      priorityReason?: string;
      suggestedCampoSlug?: string;
      suggestedTipo?: string;
    };

    const suggestedCampoSlug =
      body.suggestedCampoSlug !== undefined
        ? body.suggestedCampoSlug && isCampoSlug(body.suggestedCampoSlug)
          ? body.suggestedCampoSlug
          : ""
        : undefined;

    const proposal = await updateProposalValidation(id, {
      mvp: body.mvp,
      firstStep: body.firstStep,
      priorityReason: body.priorityReason,
      suggestedCampoSlug,
      suggestedTipo: parseTipo(body.suggestedTipo),
    });

    return NextResponse.json({ proposal });
  } catch (error) {
    console.error("Update proposal error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar la propuesta.";
    const status = message.includes("no encontrada") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
