import { getProjectPeople } from "@/lib/kg/analytics";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const people = await getProjectPeople(id);
    return NextResponse.json({ people });
  } catch (error) {
    console.error("KG project people error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron obtener las personas del proyecto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
