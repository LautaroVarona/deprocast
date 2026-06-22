import {
  deleteChatSession,
  updateChatSessionTitle,
} from "@/lib/chat/service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { title?: string };
    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "El título es obligatorio." },
        { status: 400 },
      );
    }

    const session = await updateChatSessionTitle(id, body.title);
    if (!session) {
      return NextResponse.json(
        { error: "Sesión no encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Chat session update error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar la sesión.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deleteChatSession(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Sesión no encontrada." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Chat session delete error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo eliminar la sesión.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
