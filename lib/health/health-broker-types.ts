import { z } from "zod";

/** Coerce null/empty/invalid intensity → "media" (LLM often returns null). */
export const healthIntensitySchema = z.preprocess((value) => {
  if (value === "baja" || value === "media" || value === "alta") return value;
  return "media";
}, z.enum(["baja", "media", "alta"]));

export type HealthIntensity = z.infer<typeof healthIntensitySchema>;

export const healthDraftSchema = z.object({
  domain: z.enum(["alimentacion", "entrenamiento"]),
  summary: z.string().min(1),
  occurredAtHint: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  nutrition: z
    .object({
      items: z
        .array(
          z.object({
            name: z.string(),
            quantity: z.string().optional(),
            grams: z.number().optional(),
            calories: z.number().optional(),
            protein: z.number().optional(),
            carbs: z.number().optional(),
            fat: z.number().optional(),
          }),
        )
        .default([]),
      totals: z
        .object({
          calories: z.number().optional(),
          protein: z.number().optional(),
          carbs: z.number().optional(),
          fat: z.number().optional(),
        })
        .optional(),
      notes: z.string().optional(),
    })
    .optional(),
  training: z
    .object({
      durationMin: z.number().optional(),
      intensity: healthIntensitySchema,
      sets: z
        .array(
          z.object({
            exercise: z.string(),
            series: z.number().optional(),
            reps: z.number().optional(),
            weightKg: z.number().optional(),
            durationMin: z.number().optional(),
            distanceKm: z.number().optional(),
          }),
        )
        .default([]),
      notes: z.string().optional(),
    })
    .optional(),
});

export type HealthDraft = z.infer<typeof healthDraftSchema>;
export type HealthIngestModality = "text" | "table" | "audio" | "image";
