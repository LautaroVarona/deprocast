import { isCampoSlug } from "@/lib/projects/campos";
import { PROJECT_STATUSES } from "@/lib/projects/types";
import { clampScale } from "@/lib/projects/priority";
import { createProject, listCampos, listProjects } from "@/lib/projects/service";
import type { CreateProjectInput, ProjectStatus } from "@/lib/projects/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

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

export async function GET() {
  try {
    await ensureRuntimeReady();

    const [projects, campos] = await Promise.all([listProjects(), listCampos()]);
    return NextResponse.json({ projects, campos });
  } catch (error) {
    console.error("List projects error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los proyectos del Atanor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json()) as Partial<CreateProjectInput>;

    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "El título del proyecto es obligatorio." },
        { status: 400 },
      );
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

    // Hook KG no bloqueante: ingiere el nuevo proyecto al grafo.
    const { ingestSingleProject } = await import("@/lib/kg/sources");
    void ingestSingleProject(project).catch((error) => {
      console.error("KG project hook error:", error);
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo fijar el proyecto en el Atanor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
