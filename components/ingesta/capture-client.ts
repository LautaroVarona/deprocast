import type { IngestaGravity } from "@/components/ingesta/ingesta-context";
import { UNIVERSE_HEADER } from "@/lib/babel/constants";
import { fetchJson } from "@/lib/fetch-json";
import type { IngestaChannel } from "@/lib/purifier/constants";

export function buildCaptureGravity(
  gravity: IngestaGravity,
  universeSlug?: string | null,
) {
  return {
    title: gravity.title || undefined,
    campoSlug: gravity.campoSlug,
    onda: gravity.onda,
    sourceType: gravity.sourceType,
    ...(universeSlug ? { universeSlug } : {}),
  };
}

export type CaptureRequestBody = {
  channel: IngestaChannel;
  rawText?: string;
  assetId?: string;
  filename?: string;
  gravity: ReturnType<typeof buildCaptureGravity>;
};

export type CaptureRequestOptions = {
  universeSlug?: string | null;
};

export async function postIngestaCapture(
  body: CaptureRequestBody,
  options?: CaptureRequestOptions,
) {
  const universeSlug = options?.universeSlug ?? body.gravity.universeSlug;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (universeSlug) {
    headers[UNIVERSE_HEADER] = universeSlug;
  }

  return fetchJson<{
    reviewId: string;
    captureId: string;
    particula?: string;
  }>("/api/ingesta/capture", {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...body,
      gravity: buildCaptureGravity(
        {
          title: body.gravity.title ?? "",
          campoSlug: body.gravity.campoSlug,
          onda: body.gravity.onda ?? "sin-clasificar",
          sourceType: body.gravity.sourceType,
        },
        universeSlug,
      ),
    }),
  });
}
