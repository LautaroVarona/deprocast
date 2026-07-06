import { createIncubationSessionWithWelcome } from "@/lib/projects/incubation/engine";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    await ensureRuntimeReady();
    const session = await createIncubationSessionWithWelcome();
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Create incubation session error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo iniciar la sesión de incubación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
