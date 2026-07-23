import { ensurePersonaStub } from "@/lib/kg/personas";
import { searchNodes } from "@/lib/kg/queries";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q") ?? "";
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "20", 10);

    const nodes = await searchNodes({
      type: "persona",
      q,
      limit: Number.isFinite(limitRaw) ? limitRaw : 20,
    });

    return NextResponse.json({ personas: nodes });
  } catch (error) {
    console.error("KG personas list error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron buscar personas.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json()) as { name?: string };
    const persona = await ensurePersonaStub(String(body.name ?? ""));
    return NextResponse.json({ persona }, { status: 201 });
  } catch (error) {
    console.error("KG persona stub error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear la persona.";
    const status = message.includes("vacío") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
