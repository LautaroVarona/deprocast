import {
  buildCalibrationQueue,
  normalizeQueueConfig,
} from "@/lib/vibe-calibrator/build-queue";
import {
  completeCalibrationSession,
  createCalibrationSession,
  getCalibrationSession,
} from "@/lib/vibe-calibrator/persist";
import type {
  CalibratorCardSource,
  CalibratorQueueConfig,
} from "@/lib/vibe-calibrator/types";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isValidConfig(body: unknown): body is { config: CalibratorQueueConfig } {
  if (!body || typeof body !== "object") return false;
  const config = (body as { config?: unknown }).config;
  if (!config || typeof config !== "object") return false;
  const sources = (config as CalibratorQueueConfig).sources;
  if (!Array.isArray(sources) || sources.length === 0) return false;
  return sources.every(
    (source) => source === "validated" || source === "generated",
  );
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId")?.trim();
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId es obligatorio." },
        { status: 400 },
      );
    }

    const session = await getCalibrationSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Sesión no encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Vibe calibrator session GET error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar la sesión." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!isValidConfig(body)) {
      return NextResponse.json(
        { error: "Configuración de cola inválida." },
        { status: 400 },
      );
    }

    const config = normalizeQueueConfig(body.config);
    const cards = await buildCalibrationQueue(config);

    if (cards.length === 0) {
      return NextResponse.json(
        { error: "No hay cards disponibles para calibrar." },
        { status: 422 },
      );
    }

    const { sessionId } = await createCalibrationSession(config);

    return NextResponse.json(
      {
        sessionId,
        config,
        cards,
        total: cards.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Vibe calibrator session POST error:", error);
    return NextResponse.json(
      { error: "No se pudo iniciar la sesión de calibración." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      sessionId?: string;
      action?: string;
    } | null;

    if (!body?.sessionId?.trim()) {
      return NextResponse.json(
        { error: "sessionId es obligatorio." },
        { status: 400 },
      );
    }

    if (body.action !== "complete") {
      return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
    }

    await completeCalibrationSession(body.sessionId.trim());

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Vibe calibrator session PATCH error:", error);
    return NextResponse.json(
      { error: "No se pudo cerrar la sesión." },
      { status: 500 },
    );
  }
}
