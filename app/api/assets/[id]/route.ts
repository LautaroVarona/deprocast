import { deleteAudioAsset } from "@/lib/delete-asset";
import { getAssetDetail } from "@/lib/queries/get-asset-detail";
import { prisma } from "@/lib/prisma";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const asset = await getAssetDetail(id);

    if (!asset) {
      return NextResponse.json(
        { error: "Audio no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(asset);
  } catch (error) {
    console.error("Asset detail error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el detalle del audio." },
      { status: 500 },
    );
  }
}

/** Actualiza linaje temporal (fecha/hora mutables desde la card romana). */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    await ensureRuntimeReady();
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!body) {
      return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
    }

    const existing = await prisma.audioAsset.findUnique({
      where: { id },
      select: { id: true, originAttributionId: true, originalCreatedAt: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Audio no encontrado." },
        { status: 404 },
      );
    }

    let nextDate: Date | null = null;
    if (typeof body.originalCreatedAt === "string") {
      const parsed = new Date(body.originalCreatedAt);
      if (!Number.isNaN(parsed.getTime())) nextDate = parsed;
    } else if (
      typeof body.fecha === "string" &&
      typeof body.hora === "string"
    ) {
      const fechaMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(
        body.fecha.trim(),
      );
      const horaMatch = /^(\d{1,2}):(\d{2})$/.exec(body.hora.trim());
      if (fechaMatch && horaMatch) {
        nextDate = new Date(
          Number(fechaMatch[3]),
          Number(fechaMatch[2]) - 1,
          Number(fechaMatch[1]),
          Number(horaMatch[1]),
          Number(horaMatch[2]),
          0,
          0,
        );
      }
    }

    if (!nextDate || Number.isNaN(nextDate.getTime())) {
      return NextResponse.json(
        { error: "Fecha/hora inválidas. Usá DD/MM/YYYY y HH:MM." },
        { status: 400 },
      );
    }

    await prisma.audioAsset.update({
      where: { id },
      data: { originalCreatedAt: nextDate },
    });

    if (existing.originAttributionId) {
      await prisma.originAttribution.update({
        where: { id: existing.originAttributionId },
        data: { timestampExacto: nextDate },
      });
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    return NextResponse.json({
      id,
      originalCreatedAt: nextDate.toISOString(),
      lineage: {
        fecha: `${pad(nextDate.getDate())}/${pad(nextDate.getMonth() + 1)}/${nextDate.getFullYear()}`,
        hora: `${pad(nextDate.getHours())}:${pad(nextDate.getMinutes())}`,
      },
      ok: true,
    });
  } catch (error) {
    console.error("Asset PATCH error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el linaje." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const deleted = await deleteAudioAsset(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Audio no encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id,
      message: "Audio y transcripción eliminados.",
    });
  } catch (error) {
    console.error("Asset delete error:", error);

    return NextResponse.json(
      { error: "No se pudo eliminar el audio." },
      { status: 500 },
    );
  }
}
