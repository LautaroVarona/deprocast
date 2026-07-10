import { z } from "zod";
import { BLOQUE_PRIORIDADES } from "@/lib/jornada/types";

export const listadorSuggestionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  bloque: z.enum(BLOQUE_PRIORIDADES).optional(),
  confidence: z.number().min(0).max(1).optional(),
  targetDayOffset: z.enum(["yesterday", "today", "tomorrow"]).optional(),
});

export const listadorExtractionSchema = z.object({
  tasks: z.array(listadorSuggestionSchema),
});

export type ListadorSuggestion = z.infer<typeof listadorSuggestionSchema>;
export type ListadorExtraction = z.infer<typeof listadorExtractionSchema>;
