import {
  getOrCreateOperatorProfile,
  patchOperatorProfile,
} from "@/lib/yo/store";
import { patchOperatorProfileSchema } from "@/lib/yo/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const profile = await getOrCreateOperatorProfile();
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Yo GET error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el perfil del operador.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = await request.json();
    const parsed = patchOperatorProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }

    const profile = await patchOperatorProfile(parsed.data);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Yo PATCH error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el perfil del operador.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
