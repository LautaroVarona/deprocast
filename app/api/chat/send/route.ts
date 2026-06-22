import { getChatSession } from "@/lib/chat/service";
import { normalizeSendInput, runChatTurn } from "@/lib/chat/engine";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = normalizeSendInput(body);
    if (!input) {
      return NextResponse.json(
        { error: "Payload inválido: sessionId y segments son obligatorios." },
        { status: 400 },
      );
    }

    const session = await getChatSession(input.sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Sesión no encontrada." },
        { status: 404 },
      );
    }

    const result = await runChatTurn(input);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat send error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo procesar el mensaje de chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
