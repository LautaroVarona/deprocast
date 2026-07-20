import { z } from "zod";
import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";

/** Peso hermético estricto de arista KG (escala 1–12). */
export const kgEdgeWeightSchema = z
  .number()
  .int()
  .min(MIN_BASE_WEIGHT)
  .max(MAX_BASE_WEIGHT);

export const DEFAULT_KG_EDGE_WEIGHT = 6;

export type NormalizeWeightResult = {
  weight: number;
  fellBack: boolean;
  original: unknown;
};

/**
 * Valida weight 1–12. Fuera de rango o inválido → fallback automático a 6.
 */
export function normalizeKgEdgeWeight(value: unknown): NormalizeWeightResult {
  const parsed = kgEdgeWeightSchema.safeParse(value);
  if (parsed.success) {
    return { weight: parsed.data, fellBack: false, original: value };
  }
  return {
    weight: DEFAULT_KG_EDGE_WEIGHT,
    fellBack: true,
    original: value,
  };
}

export const kgEdgeSchema = z.object({
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  relationType: z.string().min(1),
  context: z.string().min(1),
  weight: kgEdgeWeightSchema.optional(),
  reconocido: z.boolean().optional(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type KgEdgeInput = z.infer<typeof kgEdgeSchema>;
