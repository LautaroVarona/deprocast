import { createPersona } from "@/lib/personas/service";
import { listPersonas } from "@/lib/personas/queries";
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
      role?: string;
      personaKind?: string;
      aliases?: string[];
      campoSlug?: string;
    };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json(
        { error: "El nombre es obligatorio." },
        { status: 400 },
      );
    }

    const personaKind =
      body.personaKind && isPersonaKind(body.personaKind)
        ? body.personaKind
        : undefined;

    const persona = await createPersona({
      name,
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
