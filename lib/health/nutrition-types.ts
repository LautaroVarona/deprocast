import { z } from "zod";

export const nutritionItemSchema = z.object({
  name: z.string(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
});

export const nutritionTotalsSchema = z.object({
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
});

export const nutritionAnalysisSchema = z.object({
  summary: z.string(),
  items: z.array(nutritionItemSchema).default([]),
  totals: nutritionTotalsSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export type NutritionItem = z.infer<typeof nutritionItemSchema>;
export type NutritionTotals = z.infer<typeof nutritionTotalsSchema>;
export type NutritionAnalysis = z.infer<typeof nutritionAnalysisSchema>;
