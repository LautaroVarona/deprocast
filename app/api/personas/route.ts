import { listPersonas } from "@/lib/personas/queries";
import { createPersona, createPersonaEntity } from "@/lib/personas/service";
import { isPersonaKind } from "@/lib/kg/types";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const personas = await listPersonas();
    return NextResponse.json({ personas });
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
