import { listLaboralChallenges } from "@/lib/laboral/challenges";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Cuerpo de la petición inválido." },
        { status: 400 },
      );
    }

    const { challengeId } = body as { challengeId?: unknown };

    if (typeof challengeId !== "string" || challengeId.trim().length === 0) {
      return NextResponse.json(
        { error: "challengeId es obligatorio." },
        { status: 400 },
      );
    }

    const challenges = await listLaboralChallenges();
    const challenge = challenges.find(
      (item) => item.id === challengeId || item.filename === challengeId,
    );

    if (!challenge) {
      return NextResponse.json(
        { error: "Reto no encontrado en el tablero laboral." },
        { status: 404 },
      );
    }

    const session = {
      id: `focus_${Date.now()}`,
      challengeId: challenge.id,
      title: challenge.title,
      onda: challenge.onda,
      baseWeight: challenge.baseWeight,
      startedAt: new Date().toISOString(),
      field: challenge.field,
    };

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Focus session start error:", error);
    return NextResponse.json(
      { error: "No se pudo iniciar la sesión Focus." },
      { status: 500 },
    );
  }
}
