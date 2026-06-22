import {
  createChatSession,
  listChatSessions,
} from "@/lib/chat/service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sessions = await listChatSessions();
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Chat sessions list error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron listar las sesiones de chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
    };
    const session = await createChatSession(body.title);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Chat session create error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear la sesión de chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
