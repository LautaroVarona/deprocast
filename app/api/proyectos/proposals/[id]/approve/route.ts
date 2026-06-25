import { activateProposal } from "@/lib/projects/activate-proposal";
import { isCampoSlug } from "@/lib/projects/campos";
import { clampScale } from "@/lib/projects/priority";
import { PROJECT_TIPOS, type ProjectTipo } from "@/lib/projects/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const DENSITY_LEVELS = ["simple", "moderado", "completo"] as const;

function parseTipo(value: unknown): ProjectTipo | null {
  const tipo = String(value ?? "");
  return PROJECT_TIPOS.includes(tipo as ProjectTipo) ? (tipo as ProjectTipo) : null;
}

function parseDensityLevel(value: unknown): "simple" | "moderado" | "completo" | undefined {
  const level = String(value ?? "");
  return DENSITY_LEVELS.includes(level as (typeof DENSITY_LEVELS)[number])
    ? (level as (typeof DENSITY_LEVELS)[number])
    : undefined;
}

function parsePersonIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

function parseOptionalScale(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampScale(parsed) : undefined;
}

function parseCampoSlugs(
  campoSlugs: unknown,
  fallbackSlug: unknown,
): string[] {
  if (Array.isArray(campoSlugs)) {
    const slugs = campoSlugs.filter(
      (slug): slug is string => typeof slug === "string" && isCampoSlug(slug),
    );
    if (slugs.length > 0) return slugs;
  }

  const single = String(fallbackSlug ?? "");
  return single && isCampoSlug(single) ? [single] : [];
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await ensureRuntimeReady();
    const { id } = await context.params;
    const body = (await request.json()) as {
      mvp?: string;
      firstStep?: string;
      priorityReason?: string;
      tipo?: string;
      campoSlug?: string;
      campoSlugs?: unknown;
      personIds?: unknown;
      densityLevel?: string;
      gravity?: {
        prioridad?: unknown;
        impacto?: unknown;
        dificultad?: unknown;
      };
      dimensions?: {
        materia?: string;
        particula?: string;
        onda?: string;
        espacio?: string;
      };
    };

    const tipo = parseTipo(body.tipo);
    if (!tipo) {
      return NextResponse.json(
        { error: "Seleccioná un tipo válido: proyecto, reto o área." },
        { status: 400 },
      );
    }

    const campoSlugs = parseCampoSlugs(body.campoSlugs, body.campoSlug);
    if (campoSlugs.length === 0) {
      return NextResponse.json(
        { error: "Seleccioná al menos un Campo válido." },
        { status: 400 },
      );
    }

    const project = await activateProposal({
      proposalId: id,
      mvp: String(body.mvp ?? ""),
      firstStep: String(body.firstStep ?? ""),
      priorityReason: String(body.priorityReason ?? ""),
      tipo,
      campoSlug: campoSlugs[0],
      campoSlugs,
      personIds: parsePersonIds(body.personIds),
      densityLevel: parseDensityLevel(body.densityLevel),
      gravity: {
        prioridad: parseOptionalScale(body.gravity?.prioridad),
        impacto: parseOptionalScale(body.gravity?.impacto),
        dificultad: parseOptionalScale(body.gravity?.dificultad),
      },
      dimensions: body.dimensions,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Approve proposal error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo activar la propuesta.";
    const status = message.includes("no encontrada") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
