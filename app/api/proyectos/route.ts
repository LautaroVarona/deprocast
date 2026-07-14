import { isCampoSlug } from "@/lib/projects/campos";
import { PROJECT_STATUSES } from "@/lib/projects/types";
import { clampScale } from "@/lib/projects/priority";
import {
  createProject,
  listCampos,
  listProjects,
} from "@/lib/projects/service";
import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { filterProjectsForUniverse } from "@/lib/babel/universe-refs";
import type { CreateProjectInput, ProjectStatus } from "@/lib/projects/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseStatus(value: unknown): ProjectStatus {
  const estado = String(value ?? "Idea");
  return PROJECT_STATUSES.includes(estado as ProjectStatus)
    ? (estado as ProjectStatus)
    : "Idea";
}

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const universeSlug = getUniverseFilterSlugFromRequest(request);
    const [allProjects, campos] = await Promise.all([
      listProjects(),
      listCampos(universeSlug),
    ]);
    const projects = await filterProjectsForUniverse(allProjects, universeSlug);

    return NextResponse.json({ projects, campos, universe: universeSlug ?? "babel" });
  } catch (error) {
    console.error("List projects error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los proyectos del Atanor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json()) as Partial<CreateProjectInput> & {
      mode?: string;
    };

    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "El título del proyecto es obligatorio." },
        { status: 400 },
      );
    }

    const isQuickMode = body.mode === "quick";

    if (isQuickMode) {
      const { createProposal } = await import("@/lib/projects/proposal-store");
      const campoSlug =
        body.campoSlug && isCampoSlug(body.campoSlug) ? body.campoSlug : undefined;

      const proposal = await createProposal({
        title: body.title.trim(),
        description: String(body.description ?? ""),
        originType: "quick_create",
        suggestedCampoSlug: campoSlug,
      });

      return NextResponse.json({ proposal }, { status: 201 });
    }

    if (!body.campoSlug || !isCampoSlug(body.campoSlug)) {
      return NextResponse.json(
        { error: "Seleccioná un Campo válido para el proyecto." },
        { status: 400 },
      );
    }

    const input: CreateProjectInput = {
      title: body.title,
      campoSlug: body.campoSlug,
      metaTagsSecundarios: parseStringArray(body.metaTagsSecundarios),
      description: String(body.description ?? ""),
      responsable: String(body.responsable ?? ""),
      subpersonasCargo: parseStringArray(body.subpersonasCargo),
      fechaInicio: String(body.fechaInicio ?? ""),
      fechaObjetivo: String(body.fechaObjetivo ?? ""),
      prioridad: clampScale(Number(body.prioridad ?? 6)),
      impacto: clampScale(Number(body.impacto ?? 6)),
      dificultad: clampScale(Number(body.dificultad ?? 6)),
      horasEstimadas: Math.max(0, Number(body.horasEstimadas ?? 0)),
      horasRealizadas: Math.max(0, Number(body.horasRealizadas ?? 0)),
      avancePorcentaje: Math.min(100, Math.max(0, Number(body.avancePorcentaje ?? 0))),
      estado: parseStatus(body.estado),
      resultadoFinal: String(body.resultadoFinal ?? ""),
      notasIniciales: body.notasIniciales ? String(body.notasIniciales) : undefined,
    };

    const project = await createProject(input);

    void (async () => {
      try {
        const { ingestSingleProject } = await import("@/lib/kg/sources");
        await ingestSingleProject(project);
      } catch (error) {
        console.error("KG project hook error:", error);
      }
    })();

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo fijar el proyecto en el Atanor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
