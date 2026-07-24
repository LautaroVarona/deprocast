import { processingQueue } from "@/lib/processing-queue";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const pendingAssets = await prisma.audioAsset.findMany({
      where: { status: { in: ["PENDING", "ERROR"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const added = processingQueue.enqueueMany(
      pendingAssets.map((asset) => asset.id),
    );

    const status = await processingQueue.getStatusWithActive();

    return NextResponse.json({
      added,
      skipped: pendingAssets.length - added,
      queuedCount: status.queuedCount + (status.active ? 1 : 0),
      paused: status.paused,
      message:
        added > 0
          ? `${added} audio${added === 1 ? "" : "s"} agregado${added === 1 ? "" : "s"} a la cola.`
          : "No hay audios nuevos para encolar.",
    });
  } catch (error) {
    console.error("Process queue error:", error);

    return NextResponse.json(
      { error: "No se pudo encolar el procesamiento." },
      { status: 500 },
    );
  }
}

/** Pausar / reanudar envíos a Deepgram sin vaciar la cola durable. */
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      action?: string;
    } | null;

    const action = body?.action;
    if (action !== "pause" && action !== "resume") {
      return NextResponse.json(
        { error: 'Acción inválida. Usá "pause" o "resume".' },
        { status: 400 },
      );
    }

    if (action === "pause") {
      processingQueue.pause();
    } else {
      processingQueue.resume();
    }

    const status = await processingQueue.getStatusWithActive();

    return NextResponse.json({
      paused: status.paused,
      active: status.active,
      queuedCount: status.queuedCount,
      message: status.paused
        ? "Envíos a Deepgram pausados. El segmento en curso puede terminar; no se envían más."
        : "Envíos a Deepgram reanudados.",
    });
  } catch (error) {
    console.error("Process queue pause/resume error:", error);

    return NextResponse.json(
      { error: "No se pudo cambiar el estado de pausa de la cola." },
      { status: 500 },
    );
  }
}
