import { processingQueue } from "@/lib/processing-queue";
import { prisma } from "@/lib/prisma";
import { resolveUploadPath } from "@/lib/runtime-paths";
import fs from "fs";

function removeFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn(`No se pudo eliminar ${filePath}:`, error);
  }
}

export async function deleteAudioAsset(id: string): Promise<boolean> {
  const asset = await prisma.audioAsset.findUnique({ where: { id } });

  if (!asset) {
    return false;
  }

  processingQueue.cancel(id);

  const filePath = resolveUploadPath(asset.fileUrl);
  removeFile(filePath);

  await prisma.audioAsset.delete({ where: { id } });

  return true;
}
