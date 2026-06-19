import type { IngestaGravity } from "@/components/ingesta/ingesta-context";
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
  const response = await fetch("/api/ingesta/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let data: { error?: string; reviewId?: string; captureId?: string; particula?: string };

  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    throw new Error(
      response.ok
        ? "La respuesta del servidor no es JSON válido."
        : `Error del servidor (${response.status}). Revisá el deploy en Vercel.`,
    );
  }

  if (!response.ok) {
    throw new Error(data.error ?? "No se pudo capturar la prima materia");
  }

  return data as {
    reviewId: string;
    captureId: string;
    particula?: string;
  };
}
