import "server-only";

import { cohereChatWithImages } from "@/lib/cohere/vision";
import {
  nutritionAnalysisSchema,
  type NutritionAnalysis,
} from "@/lib/health/nutrition-types";
import { storeInTacho } from "@/lib/ingesta/vision/extract";
import { stripMarkdownFences } from "@/lib/cohere/extract";
import path from "node:path";

const FOOD_VISION_PROMPT = `Sos Nutrimetron con visión. Analizá esta imagen de comida/bebida para control alimentario.

Devolvé ÚNICAMENTE JSON válido (sin markdown):
{
  "summary": "resumen corto para historial",
  "items": [{ "name": "", "quantity": "", "unit": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 }],
  "totals": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
  "confidence": 0.0 a 1.0,
  "notes": "observaciones opcionales"
}

Identificá platos, porciones visibles y estimá macros cuando sea posible. Si no hay comida clara, confidence baja y summary descriptivo.`;

const SUPPORTED_EXT = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".heic"];

function resolveMime(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".heic": "image/heic",
  };
  const mime = map[ext];
  if (!mime) {
    throw new Error(
      "Formato no soportado. Usá imágenes (.png, .jpg, .webp, .gif, .heic).",
    );
  }
  return mime;
}

export type FoodVisionResult = NutritionAnalysis & {
  tachoPath: string;
  mimeType: string;
  rawDescription: string;
};

export async function analyzeFoodImage(
  buffer: Buffer,
  filename: string,
): Promise<FoodVisionResult> {
  const mimeType = resolveMime(filename);
  const tachoPath = await storeInTacho(buffer, filename);
  const base64 = buffer.toString("base64");

  const raw = stripMarkdownFences(
    await cohereChatWithImages({
      systemPrompt: FOOD_VISION_PROMPT,
      images: [{ base64, mimeType }],
      userText: "Analizá esta ingesta y devolvé el JSON de Nutrimetron.",
      jsonMode: true,
    }),
  );

  let analysis: NutritionAnalysis;
  try {
    analysis = nutritionAnalysisSchema.parse(JSON.parse(raw));
  } catch {
    analysis = {
      summary: "Ingesta visual registrada",
      items: [],
      confidence: 0.25,
      notes: "No se pudo estructurar la imagen automáticamente.",
    };
  }

  return {
    ...analysis,
    tachoPath,
    mimeType,
    rawDescription: analysis.summary,
  };
}
