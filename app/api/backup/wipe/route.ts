import { BackupGuardError } from "@/lib/backup/guards";
import { factoryResetSystem } from "@/lib/backup/wipe";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Token de confirmación del body (tras validar la frase tipada en UI). */
export const WIPE_CONFIRM_TOKEN = "WIPE";

/** Frase que el operador debe escribir exactamente en la UI. */
export const WIPE_CONFIRM_PHRASE = "ELIMINAR TODO";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      confirm?: unknown;
      phrase?: unknown;
    } | null;

    if (body?.confirm !== WIPE_CONFIRM_TOKEN) {
      return NextResponse.json(
        {
          error:
            "Falta confirmación destructiva (confirm=WIPE). Esta acción borra todos los datos sin recuperación.",
        },
        { status: 400 },
      );
    }

    if (
      typeof body.phrase !== "string" ||
      body.phrase.trim() !== WIPE_CONFIRM_PHRASE
    ) {
      return NextResponse.json(
        {
          error: `Debés enviar phrase="${WIPE_CONFIRM_PHRASE}" para confirmar el borrado irreversible.`,
        },
        { status: 400 },
      );
    }

    const result = await factoryResetSystem();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Factory reset error:", error);

    if (error instanceof BackupGuardError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar el reinicio del sistema.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
