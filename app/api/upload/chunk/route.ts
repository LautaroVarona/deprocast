import {
  UPLOAD_CHUNK_BYTES,
} from "@/lib/audio-upload/constants";
import {
  readMeta,
  writeChunk,
  writeMeta,
} from "@/lib/audio-upload/staging";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function readOptionalField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    // Overhead multipart: dejar margen sobre 3 MB de payload útil.
    if (contentLength > UPLOAD_CHUNK_BYTES + 512 * 1024) {
      return NextResponse.json(
        { error: "Chunk demasiado grande.", code: 413 },
        { status: 413 },
      );
    }

    const formData = await request.formData();
    const uploadId = readOptionalField(formData, "uploadId");
    const indexRaw = readOptionalField(formData, "index");
    const totalRaw = readOptionalField(formData, "total");
    const chunk = formData.get("chunk");

    if (!uploadId) {
      return NextResponse.json({ error: "Falta uploadId." }, { status: 400 });
    }

    const index = Number(indexRaw);
    const total = Number(totalRaw);
    if (!Number.isInteger(index) || index < 0) {
      return NextResponse.json({ error: "index inválido." }, { status: 400 });
    }

    const meta = await readMeta(uploadId);
    if (!meta) {
      return NextResponse.json(
        { error: "Upload no inicializado." },
        { status: 404 },
      );
    }

    if (Number.isInteger(total) && total !== meta.totalChunks) {
      return NextResponse.json(
        { error: "total no coincide con init." },
        { status: 400 },
      );
    }

    if (index >= meta.totalChunks) {
      return NextResponse.json(
        { error: "index fuera de rango." },
        { status: 400 },
      );
    }

    if (!(chunk instanceof Blob)) {
      return NextResponse.json(
        { error: "Falta chunk." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await chunk.arrayBuffer());
    if (buffer.byteLength > UPLOAD_CHUNK_BYTES + 64 * 1024) {
      return NextResponse.json(
        { error: "Chunk demasiado grande.", code: 413 },
        { status: 413 },
      );
    }

    await writeChunk(uploadId, index, buffer);

    if (!meta.received.includes(index)) {
      meta.received.push(index);
      meta.received.sort((a, b) => a - b);
      await writeMeta(meta);
    }

    return NextResponse.json({
      uploadId,
      assetId: meta.assetId,
      index,
      received: meta.received.length,
      totalChunks: meta.totalChunks,
    });
  } catch (error) {
    console.error("Upload chunk error:", error);
    return NextResponse.json(
      { error: "No se pudo recibir el chunk." },
      { status: 500 },
    );
  }
}
