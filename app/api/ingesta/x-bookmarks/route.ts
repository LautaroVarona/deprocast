import { dedupeTweets, parseXBookmarkFile } from "@/lib/ingesta/x-bookmarks/parser";
import {
  countXBookmarksByStatus,
  importXBookmarks,
  listPendingXBookmarks,
  listXBookmarks,
} from "@/lib/ingesta/x-bookmarks/store";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await ensureRuntimeReady();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const pendingOnly = searchParams.get("pending") === "true";

    const [bookmarks, counts] = await Promise.all([
      pendingOnly
        ? listPendingXBookmarks()
        : listXBookmarks(status ? { status: status as never } : undefined),
      countXBookmarksByStatus(),
    ]);

    return NextResponse.json({ bookmarks, counts });
  } catch (error) {
    console.error("List x-bookmarks error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudieron cargar los marcadores.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureRuntimeReady();

    const formData = await request.formData();
    const file = formData.get("file");
    const rawNetwork = formData.get("sourceNetwork");
    const sourceNetwork =
      typeof rawNetwork === "string" && rawNetwork.trim()
        ? rawNetwork.trim().toLowerCase()
        : "x";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Subí un archivo JSON o CSV de marcadores de X." },
        { status: 400 },
      );
    }

    const content = await file.text();
    const parsed = dedupeTweets(parseXBookmarkFile(file.name, content));

    if (parsed.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron marcadores válidos en el archivo." },
        { status: 400 },
      );
    }

    const result = await importXBookmarks(parsed, { sourceNetwork });
    const bookmarks = await listPendingXBookmarks();

    return NextResponse.json({ ...result, bookmarks, sourceNetwork }, { status: 201 });
  } catch (error) {
    console.error("Import x-bookmarks error:", error);
    const message =
      error instanceof Error ? error.message : "No se pudo importar el archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
