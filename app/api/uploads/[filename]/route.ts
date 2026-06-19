import { resolveUploadPath } from "@/lib/runtime-paths";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const AUDIO_MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ filename: string }> },
) {
  try {
    const { filename } = await context.params;
    const safeName = path.basename(filename);
    const filePath = resolveUploadPath(`/api/uploads/${safeName}`);

    await access(filePath);

    const extension = path.extname(safeName).toLowerCase();
    const contentType = AUDIO_MIME[extension] ?? "application/octet-stream";
    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Archivo de audio no encontrado." },
      { status: 404 },
    );
  }
}
