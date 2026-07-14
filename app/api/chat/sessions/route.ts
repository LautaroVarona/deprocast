import {
  createChatSession,
  listChatSessions,
} from "@/lib/chat/service";
import {
  resolveContextSealFromRequest,
  shouldFilterByUniverse,
} from "@/lib/babel/context-seal";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const universeSlug = resolveContextSealFromRequest(request);
    const sessions = await listChatSessions(
      shouldFilterByUniverse(universeSlug) ? universeSlug : undefined,
    );
    return NextResponse.json({ sessions, universe: universeSlug });
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
    const universeSlug = resolveContextSealFromRequest(request);
    const session = await createChatSession(
      body.title,
      shouldFilterByUniverse(universeSlug) ? universeSlug : undefined,
    );
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
