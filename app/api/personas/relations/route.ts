import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import {
  createRelacionPersonaCampo,
  createRelacionPersonaPersona,
  createRelacionPersonaProyecto,
} from "@/lib/personas/relations";
import { sealKgNodeInUniverse } from "@/lib/personas/universe-seal";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const universeSlug = getUniverseFilterSlugFromRequest(request);

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
      personaNombre?: string;
      origenNombre?: string;
      destinoNombre?: string;
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
        personaNombre: body.personaNombre,
      });
      await sealKgNodeInUniverse(
        relation.personaId,
        universeSlug,
        body.personaNombre,
      );
      await sealKgNodeInUniverse(relation.campoNodeId, universeSlug);
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
        personaNombre: body.personaNombre,
      });
      await sealKgNodeInUniverse(
        relation.personaId,
        universeSlug,
        body.personaNombre,
      );
      await sealKgNodeInUniverse(relation.proyectoId, universeSlug);
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
      origenNombre: body.origenNombre ?? body.personaNombre,
      destinoNombre: body.destinoNombre,
    });

    await sealKgNodeInUniverse(
      relation.origenId,
      universeSlug,
      body.origenNombre ?? body.personaNombre,
    );
    await sealKgNodeInUniverse(
      relation.destinoId,
      universeSlug,
      body.destinoNombre,
    );

    return NextResponse.json({ relation }, { status: 201 });
  } catch (error) {
    console.error("Persona relation create error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear la relación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
