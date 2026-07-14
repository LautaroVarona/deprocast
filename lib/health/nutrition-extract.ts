import "server-only";

import {
  nutritionAnalysisSchema,
  type NutritionAnalysis,
} from "@/lib/health/nutrition-types";
import { cohereGenerateText } from "@/lib/cohere/chat";
import { stripMarkdownFences } from "@/lib/cohere/extract";

const NUTRITION_EXTRACT_PROMPT = `Sos Nutrimetron, agente de control alimentario de Deprocast. Analizá la descripción de una ingesta y devolvé ÚNICAMENTE JSON válido (sin markdown) con esta forma:
{
  "summary": "resumen corto para historial (máx 120 caracteres)",
  "items": [
    {
      "name": "alimento",
      "quantity": "cantidad opcional",
      "unit": "unidad opcional",
      "calories": número opcional,
      "protein": gramos opcional,
      "carbs": gramos opcional,
      "fat": gramos opcional
    }
  ],
  "totals": { "calories": número, "protein": número, "carbs": número, "fat": número },
  "confidence": 0.0 a 1.0,
  "notes": "observaciones breves opcionales"
}

Reglas:
- Estimá macros solo cuando sea razonable; no inventes precisión falsa.
- Si el texto es vago, devolvé items genéricos y confidence baja.
- summary debe ser legible en un feed de historial.
- No incluyas campos extra fuera del schema.`;

export async function extractNutritionFromText(
  text: string,
  context?: string,
): Promise<NutritionAnalysis> {
  const userContent = context
    ? `${context}\n\n---\nTexto de ingesta:\n${text}`
    : text;

  const raw = stripMarkdownFences(
    await cohereGenerateText({
      systemPrompt: NUTRITION_EXTRACT_PROMPT,
      userContent,
      modelKind: "fast",
      jsonMode: true,
      throttle: true,
    }),
  );

  try {
    const parsed = nutritionAnalysisSchema.parse(JSON.parse(raw));
    return parsed;
  } catch {
    return {
      summary: text.trim().slice(0, 120) || "Ingesta registrada",
      items: [],
      confidence: 0.3,
      notes: "Análisis parcial — texto sin estructura clara.",
    };
  }
}

export function mergeNutritionAnalyses(
  primary: NutritionAnalysis,
  secondary?: NutritionAnalysis | null,
): NutritionAnalysis {
  if (!secondary) return primary;

  return {
    summary: primary.summary || secondary.summary,
    items: primary.items.length > 0 ? primary.items : secondary.items,
    totals: primary.totals ?? secondary.totals,
    confidence: Math.max(primary.confidence ?? 0, secondary.confidence ?? 0),
    notes: [primary.notes, secondary.notes].filter(Boolean).join(" · ") || undefined,
  };
}
