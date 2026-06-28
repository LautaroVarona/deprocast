import { deleteAudioAsset } from "@/lib/delete-asset";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ApplyBody = {
  assetIds?: string[];
};

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const body = (await request.json().catch(() => null)) as ApplyBody | null;
    const assetIds = body?.assetIds?.filter(Boolean) ?? [];

    if (assetIds.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un assetId para eliminar." },
        { status: 400 },
      );
    }

    const deleted: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of assetIds) {
      try {
        const ok = await deleteAudioAsset(id);
        if (ok) deleted.push(id);
        else failed.push({ id, error: "No encontrado." });
      } catch (error) {
        failed.push({
          id,
          error:
            error instanceof Error
              ? error.message
              : "No se pudo eliminar el audio.",
        });
      }
    }

    return NextResponse.json({
      deletedCount: deleted.length,
      deleted,
      failed,
      message:
        deleted.length > 0
          ? `${deleted.length} copia${deleted.length === 1 ? "" : "s"} eliminada${deleted.length === 1 ? "" : "s"}.`
          : "No se eliminó ninguna copia.",
    });
  } catch (error) {
    console.error("Audio station dedup apply error:", error);
    return NextResponse.json(
      { error: "No se pudo aplicar la desduplicación." },
      { status: 500 },
    );
  }
}
