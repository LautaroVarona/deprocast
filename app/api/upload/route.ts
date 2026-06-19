import { isAllowedAudioFile } from "@/lib/audio-validation";
import { prisma } from "@/lib/prisma";
import {
  getUploadDir,
  getUploadPublicUrl,
} from "@/lib/runtime-paths";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { randomUUID } from "crypto";
import { mkdir, stat, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo." },
        { status: 400 },
      );
    }

    if (!isAllowedAudioFile(file.name, file.type)) {
      return NextResponse.json(
        { error: "Formato no permitido. Usá .mp3, .m4a, .wav u .ogg." },
        { status: 400 },
      );
    }

    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });

    const extension = path.extname(file.name).toLowerCase();
    const storedFilename = `${randomUUID()}${extension}`;
    const filePath = path.join(uploadDir, storedFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileStats = await stat(filePath);

    const asset = await prisma.audioAsset.create({
      data: {
        filename: file.name,
        fileUrl: getUploadPublicUrl(storedFilename),
        originalCreatedAt: fileStats.birthtime,
        status: "PENDING",
      },
    });

    return NextResponse.json(
      {
        id: asset.id,
        filename: asset.filename,
        status: asset.status,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "No se pudo subir el archivo." },
      { status: 500 },
    );
  }
}
