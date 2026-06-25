import { getDataRoot } from "@/lib/runtime-paths";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const IMAGE_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: segments } = await context.params;
    if (!segments?.length) {
      return NextResponse.json({ error: "Ruta inválida." }, { status: 400 });
    }

    const safeSegments = segments.map((segment) =>
      path.basename(segment.replace(/\.\./g, "")),
    );
    const relativePath = safeSegments.join("/");
    const filePath = path.join(getDataRoot(), relativePath);

    const dataRoot = path.resolve(getDataRoot());
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(dataRoot)) {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }

    await access(resolved);

    const extension = path.extname(resolved).toLowerCase();
    const contentType = IMAGE_MIME[extension] ?? "application/octet-stream";
    const buffer = await readFile(resolved);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Imagen no encontrada." }, { status: 404 });
  }
}
