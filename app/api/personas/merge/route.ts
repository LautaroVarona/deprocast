import { mergePersonaIdentities } from "@/lib/personas/service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      keepId?: string;
      dropId?: string;
      /** Alias semántico: la candidata (drop) se fusiona en la canónica (keep). */
      candidateId?: string;
      canonicalId?: string;
    } | null;

    const keepId =
      body?.keepId?.trim() || body?.canonicalId?.trim() || "";
    const dropId =
      body?.dropId?.trim() || body?.candidateId?.trim() || "";

    if (!keepId || !dropId) {
      return NextResponse.json(
        {
          error:
            "Indicá keepId (canónica) y dropId (alias a absorber).",
        },
        { status: 400 },
      );
    }

    const result = await mergePersonaIdentities(keepId, dropId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Persona merge error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron fusionar las identidades.";
    const status =
      message.includes("no encontrada") || message.includes("distintas")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
