import { searchMentionSuggestions } from "@/lib/chat/mention-index";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get("q") ?? "";
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "20", 10);
    const suggestions = await searchMentionSuggestions(
      query,
      Number.isFinite(limitRaw) ? limitRaw : 20,
    );
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Chat mentions error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron buscar menciones.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
