import { isCampoSlug } from "@/lib/projects/campos";
import { getCampo, updateCampo } from "@/lib/projects/service";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await ensureRuntimeReady();

    const { slug } = await context.params;
    if (!isCampoSlug(slug)) {
      return NextResponse.json({ error: "Slug de Campo inválido." }, { status: 400 });
    }

    const campo = await getCampo(slug);
    if (!campo) {
      return NextResponse.json({ error: "Campo no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ campo });
  } catch (error) {
    console.error("Get campo error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo cargar el Campo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await ensureRuntimeReady();

    const { slug } = await context.params;
    if (!isCampoSlug(slug)) {
      return NextResponse.json({ error: "Slug de Campo inválido." }, { status: 400 });
    }

    const body = (await request.json()) as { label?: string; description?: string };
    const campo = await updateCampo(slug, {
      label: body.label,
      description: body.description,
    });

    return NextResponse.json({ campo });
  } catch (error) {
    console.error("Update campo error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el Campo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
