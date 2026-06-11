import { prisma } from "@/lib/prisma";

export function logInfo(assetId: string, message: string): void {
  console.log(`[${assetId}] ${message}`);
}

export function logError(assetId: string, message: string, error?: unknown): void {
  console.error(`[${assetId}] ${message}`, error ?? "");
}

export async function updatePartialText(
  assetId: string,
  partialText: string,
): Promise<void> {
  await prisma.audioAsset.update({
    where: { id: assetId },
    data: { partialText },
  });
}
