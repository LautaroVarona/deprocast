import { isCampoSlug } from "@/lib/projects/campos";
import { PROJECT_TIPOS } from "@/lib/projects/types";
import { z } from "zod";

export const incubationIdentidadSchema = z.object({
  nombre: z.string().optional(),
  origen_tiempo: z.string().optional(),
  proyeccion: z.string().optional(),
});

export const incubationEcosistemaSchema = z.object({
  personas: z.array(z.string()).default([]),
  recursos: z.array(z.string()).default([]),
});

export const incubationEjecucionSchema = z.object({
  estado_actual: z.string().optional(),
  siguientes_pasos: z.array(z.string()).default([]),
});

export const incubationCompletitudSchema = z.object({
  identidad: z.boolean().default(false),
  ecosistema: z.boolean().default(false),
  ejecucion: z.boolean().default(false),
});

export const incubationExtractionSchema = z.object({
  identidad: incubationIdentidadSchema.default({}),
  ecosistema: incubationEcosistemaSchema.default({ personas: [], recursos: [] }),
  ejecucion: incubationEjecucionSchema.default({ siguientes_pasos: [] }),
  campoSlug: z
    .string()
    .optional()
    .refine((v) => v === undefined || isCampoSlug(v), { message: "campoSlug inválido" }),
  tipo: z.enum(PROJECT_TIPOS).optional(),
  completitud: incubationCompletitudSchema.default({
    identidad: false,
    ecosistema: false,
    ejecucion: false,
  }),
});

export type IncubationExtraction = z.infer<typeof incubationExtractionSchema>;

export const incubationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string(),
});

export type IncubationMessage = z.infer<typeof incubationMessageSchema>;

export const INCUBATION_SESSION_STATUSES = ["active", "consolidated", "abandoned"] as const;
export type IncubationSessionStatus = (typeof INCUBATION_SESSION_STATUSES)[number];

export function emptyExtraction(): IncubationExtraction {
  return incubationExtractionSchema.parse({});
}

export function parseExtractionState(raw: unknown): IncubationExtraction {
  const result = incubationExtractionSchema.safeParse(raw);
  return result.success ? result.data : emptyExtraction();
}

export function parseMessages(raw: unknown): IncubationMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => incubationMessageSchema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => r.data);
}
