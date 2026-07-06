import "server-only";

import { listReviewRecords } from "@/lib/purifier/review-store";

export async function getReviewIdForAsset(
  assetId: string,
): Promise<string | null> {
  const records = await listReviewRecords();
  const match = records.find((record) => record.assetId === assetId);
  return match?.reviewId ?? null;
}
