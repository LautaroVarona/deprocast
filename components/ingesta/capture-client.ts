import type { IngestaGravity } from "@/components/ingesta/ingesta-context";
import { fetchJson } from "@/lib/fetch-json";
import type { IngestaChannel } from "@/lib/purifier/constants";

export function buildCaptureGravity(gravity: IngestaGravity) {
  return {
    title: gravity.title || undefined,
    campoSlug: gravity.campoSlug,
    onda: gravity.onda,
    sourceType: gravity.sourceType,
  };
}

export type CaptureRequestBody = {
  channel: IngestaChannel;
  rawText?: string;
  assetId?: string;
  filename?: string;
  gravity: ReturnType<typeof buildCaptureGravity>;
};

export async function postIngestaCapture(body: CaptureRequestBody) {
  return fetchJson<{
    reviewId: string;
    captureId: string;
    particula?: string;
  }>("/api/ingesta/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
