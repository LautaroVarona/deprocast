import { mergeNodes } from "@/lib/kg/merge";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      keepId?: string;
      dropId?: string;
    };

    if (!body.keepId?.trim() || !body.dropId?.trim()) {
      return NextResponse.json(
        { error: "Se requieren keepId y dropId." },
        { status: 400 },
      );
    }

    if (body.keepId === body.dropId) {
      return NextResponse.json(
        { error: "keepId y dropId no pueden ser iguales." },
        { status: 400 },
      );
    }

    const result = await mergeNodes(body.keepId.trim(), body.dropId.trim());
    return NextResponse.json(result);
  } catch (error) {
    console.error("KG merge error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron fusionar los nodos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
