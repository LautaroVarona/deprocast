import {
  createRelacionPersonaCampo,
  createRelacionPersonaPersona,
  createRelacionPersonaProyecto,
} from "@/lib/personas/relations";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      kind?: string;
      origenId?: string;
      destinoId?: string;
      tipoRelacion?: string;
      contexto?: string;
      personaId?: string;
      proyectoId?: string;
      rolPrincipal?: string;
      campoSlug?: string;
    };

    if (body.kind === "persona-campo" || body.kind === "campo") {
      if (!body.personaId || !body.campoSlug) {
        return NextResponse.json(
          { error: "personaId y campoSlug son obligatorios." },
          { status: 400 },
        );
      }
      const relation = await createRelacionPersonaCampo({
        personaId: body.personaId,
        campoSlug: body.campoSlug,
        contexto: body.contexto,
      });
      return NextResponse.json({ relation }, { status: 201 });
    }

    if (body.kind === "persona-proyecto") {
      if (!body.personaId || !body.proyectoId || !body.rolPrincipal) {
        return NextResponse.json(
          { error: "personaId, proyectoId y rolPrincipal son obligatorios." },
          { status: 400 },
        );
      }
      const relation = await createRelacionPersonaProyecto({
        personaId: body.personaId,
        proyectoId: body.proyectoId,
        rolPrincipal: body.rolPrincipal,
        contexto: body.contexto,
      });
      return NextResponse.json({ relation }, { status: 201 });
    }

    if (!body.origenId || !body.destinoId || !body.tipoRelacion) {
      return NextResponse.json(
        { error: "origenId, destinoId y tipoRelacion son obligatorios." },
        { status: 400 },
      );
    }

    const relation = await createRelacionPersonaPersona({
      origenId: body.origenId,
      destinoId: body.destinoId,
      tipoRelacion: body.tipoRelacion,
      contexto: body.contexto,
    });

    return NextResponse.json({ relation }, { status: 201 });
  } catch (error) {
    console.error("Persona relation create error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear la relación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
