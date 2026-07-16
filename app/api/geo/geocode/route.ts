import { geocodeAddress } from "@/lib/geo/geocode";
import { geocodeRequestSchema } from "@/lib/geo/types";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const body = await request.json();
    const parsed = geocodeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "address es obligatorio." },
        { status: 400 },
      );
    }

    const result = await geocodeAddress(parsed.data.address);
    return NextResponse.json({ geocode: result });
  } catch (error) {
    console.error("Geocode POST error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo geocodificar la dirección.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
