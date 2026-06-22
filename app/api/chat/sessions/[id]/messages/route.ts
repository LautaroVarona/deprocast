import { listChatMessages } from "@/lib/chat/service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const limitRaw = Number.parseInt(
      request.nextUrl.searchParams.get("limit") ?? "100",
      10,
    );
    const messages = await listChatMessages(
      id,
      Number.isFinite(limitRaw) ? limitRaw : 100,
    );
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Chat messages list error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los mensajes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
