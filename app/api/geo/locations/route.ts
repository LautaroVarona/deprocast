import {
  createGeoLocation,
  ensurePermanentLocationsSeeded,
  listGeoLocations,
} from "@/lib/geo/service";
import { createGeoLocationSchema } from "@/lib/geo/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    await ensurePermanentLocationsSeeded();

    const permanentOnly =
      request.nextUrl.searchParams.get("permanent") === "true";
    const locations = await listGeoLocations({ permanentOnly });
    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Geo locations GET error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron listar ubicaciones.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = await request.json();
    const parsed = createGeoLocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Payload inválido." },
        { status: 400 },
      );
    }

    const location = await createGeoLocation(parsed.data);
    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    console.error("Geo locations POST error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear la ubicación.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
