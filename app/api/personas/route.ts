import { listPersonas } from "@/lib/personas/queries";
import { createPersona, createPersonaEntity } from "@/lib/personas/service";
import { isPersonaKind } from "@/lib/kg/types";
import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { resolveUniverseKgNodeIds } from "@/lib/babel/universe-refs";
import type { PersonaListStatus } from "@/lib/personas/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function parseStatus(value: string | null): PersonaListStatus {
  if (value === "pending" || value === "all" || value === "verified") {
    return value;
  }
  return "verified";
}

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const status = parseStatus(request.nextUrl.searchParams.get("status"));
    const universeSlug = getUniverseFilterSlugFromRequest(request);
    const allPersonas = await listPersonas(status);

    if (!universeSlug) {
      return NextResponse.json({
        personas: allPersonas,
        universe: "babel",
        status,
      });
    }

    const nodeIds = await resolveUniverseKgNodeIds(universeSlug);
    if (nodeIds && nodeIds.size === 0) {
      return NextResponse.json({
        personas: [],
        universe: universeSlug,
        status,
      });
    }

    const personas = allPersonas.filter(
      (persona) => nodeIds?.has(persona.id) ?? false,
    );

    return NextResponse.json({ personas, universe: universeSlug, status });
  } catch (error) {
    console.error("Personas list error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron listar las personas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json()) as {
      name?: string;
      nombrePrincipal?: string;
      role?: string;
      personaKind?: string;
      aliases?: string[];
      notasGenerales?: string;
      campoSlug?: string;
    };

    const nombre =
      body.nombrePrincipal?.trim() || body.name?.trim() || "";
    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio." },
        { status: 400 },
      );
    }

    if (body.notasGenerales !== undefined || body.nombrePrincipal) {
      const persona = await createPersonaEntity({
        nombrePrincipal: nombre,
        aliases: Array.isArray(body.aliases) ? body.aliases : undefined,
        notasGenerales: body.notasGenerales,
      });
      return NextResponse.json({ persona }, { status: 201 });
    }

    const personaKind =
      body.personaKind && isPersonaKind(body.personaKind)
        ? body.personaKind
        : undefined;

    const persona = await createPersona({
      name: nombre,
      role: body.role?.trim(),
      personaKind,
      aliases: Array.isArray(body.aliases) ? body.aliases : undefined,
      campoSlug: body.campoSlug?.trim(),
    });

    return NextResponse.json({ persona }, { status: 201 });
  } catch (error) {
    console.error("Persona create error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear la persona.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
