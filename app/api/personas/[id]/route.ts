import { listPersonaRelations } from "@/lib/personas/relations";
import {
  deletePersonaEntity,
  getPersonaEntity,
  updatePersonaEntity,
} from "@/lib/personas/service";
import { getPersonaByIdOrSlug } from "@/lib/personas/queries";
import { sealKgNodeInUniverse } from "@/lib/personas/universe-seal";
import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();

    const { id } = await context.params;
    const persona = await getPersonaByIdOrSlug(id);
    const entity = await getPersonaEntity(id);

    if (!persona || !entity) {
      return NextResponse.json({ error: "Persona no encontrada." }, { status: 404 });
    }

    const universeSlug = getUniverseFilterSlugFromRequest(request);
    await sealKgNodeInUniverse(
      entity.id,
      universeSlug,
      entity.nombrePrincipal,
    );

    const relations = await listPersonaRelations(entity.id);

    return NextResponse.json({ persona, entity, relations });
  } catch (error) {
    console.error("Persona detail error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo obtener la ficha de la persona.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();

    const { id } = await context.params;
    const body = (await request.json()) as {
      nombrePrincipal?: string;
      aliases?: string[];
      notasGenerales?: string;
    };

    const existing = await getPersonaEntity(id);
    if (!existing) {
      return NextResponse.json({ error: "Persona no encontrada." }, { status: 404 });
    }

    const persona = await updatePersonaEntity(existing.id, {
      nombrePrincipal: body.nombrePrincipal,
      aliases: Array.isArray(body.aliases) ? body.aliases : undefined,
      notasGenerales: body.notasGenerales,
    });

    return NextResponse.json({ persona });
  } catch (error) {
    console.error("Persona update error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar la persona.";
    const status = message.includes("Ya existe") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await ensureRuntimeReady();

    const { id } = await context.params;
    const existing = await getPersonaEntity(id);
    if (!existing) {
      return NextResponse.json({ error: "Persona no encontrada." }, { status: 404 });
    }

    await deletePersonaEntity(existing.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Persona delete error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la persona.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
