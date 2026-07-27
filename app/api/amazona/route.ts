import { getUniverseFilterSlugFromRequest } from "@/lib/babel/universe-scope";
import {
  createAmazonAResource,
  listAmazonAResources,
} from "@/lib/amazona/store";
import { createAmazonAResourceSchema } from "@/lib/amazona/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureRuntimeReady();
    const resources = await listAmazonAResources();
    return NextResponse.json({ resources });
  } catch (error) {
    console.error("AmazonA GET error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo listar AmazonA.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = await request.json();
    const parsed = createAmazonAResourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 400 },
      );
    }

    const universeSlug = getUniverseFilterSlugFromRequest(request);
    const resource = await createAmazonAResource(parsed.data, {
      universeSlug: universeSlug ?? undefined,
    });
    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    console.error("AmazonA POST error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo crear el recurso.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
