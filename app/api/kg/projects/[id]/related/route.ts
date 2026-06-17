import { getRelatedProjects } from "@/lib/kg/analytics";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const limitRaw = Number.parseInt(
      request.nextUrl.searchParams.get("limit") ?? "20",
      10,
    );
    const related = await getRelatedProjects(
      id,
      Number.isFinite(limitRaw) ? limitRaw : 20,
    );
    return NextResponse.json({ related });
  } catch (error) {
    console.error("KG related projects error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron obtener proyectos relacionados.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
