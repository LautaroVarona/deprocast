import { DEFAULT_CAMPO_SLUG, isCampoSlug } from "@/lib/projects/campos";
import { PROJECT_TIPOS, type ProjectTipo } from "@/lib/projects/types";
import { MAGO3_PHASES } from "@/lib/yo/types";
import { z } from "zod";

export const MOSCOW_PRIORITIES = ["must", "should", "could", "wont"] as const;
export type MoscowPriority = (typeof MOSCOW_PRIORITIES)[number];

export const moscowPrioritySchema = z.enum(MOSCOW_PRIORITIES);

export const ideateMentionSchema = z.object({
  prefix: z.enum(["@", "#"]),
  label: z.string().trim().min(1).max(200),
  entityId: z.string().trim().min(1).optional(),
  entityType: z.enum(["persona", "campo", "tag", "proyecto", "area"]).optional(),
});

export const ideateRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  brainDump: z.string().max(20_000).default(""),
  amazonAResourceIds: z.array(z.string().min(1)).default([]),
  mentions: z.array(ideateMentionSchema).default([]),
});

export type IdeateRequest = z.infer<typeof ideateRequestSchema>;
export type IdeateMention = z.infer<typeof ideateMentionSchema>;

export const moscowTaskSchema = z.object({
  title: z.string().trim().min(1).max(240),
  priority: moscowPrioritySchema,
  notes: z.string().max(500).optional(),
});

export type MoscowTask = z.infer<typeof moscowTaskSchema>;

export const ideateLlmOutputSchema = z.object({
  short_pitch: z.string().trim().min(1).max(500),
  domain: z.string().trim().min(1).max(120),
  suggested_campo_slug: z.string().trim().optional(),
  suggested_tipo: z.enum(PROJECT_TIPOS).optional(),
  moscow_tasks: z.array(moscowTaskSchema).max(24).default([]),
  suggested_energy_cost: z.number().int().min(1).max(12),
  suggested_mago_phase: z.enum(MAGO3_PHASES),
  suggested_mago12: z.number().int().min(1).max(12).optional(),
  suggested_person_labels: z.array(z.string().trim().min(1)).default([]),
  suggested_tags: z.array(z.string().trim().min(1)).default([]),
});

export type IdeateLlmOutput = z.infer<typeof ideateLlmOutputSchema>;

export const resolvedMentionSchema = z.object({
  prefix: z.enum(["@", "#"]),
  label: z.string(),
  kgNodeId: z.string().nullable(),
  entityType: z.string(),
  matched: z.boolean(),
});

export type ResolvedIdeateMention = z.infer<typeof resolvedMentionSchema>;

export const ideateAmazonASchema = z.object({
  id: z.string(),
  name: z.string(),
  powerIds: z.array(z.string()),
});

export const matrixSeedSchema = z.object({
  identidad: z.object({
    title: z.string(),
    short_pitch: z.string(),
    domain: z.string(),
    tipo: z.enum(PROJECT_TIPOS).nullable(),
    campoSlug: z.string(),
  }),
  arquitectura: z.object({
    personNodeIds: z.array(z.string()),
    tagLabels: z.array(z.string()),
    areaNodeIds: z.array(z.string()),
  }),
  motor_temporal: z.object({
    mago3: z.enum(MAGO3_PHASES),
    mago12: z.number().int().min(1).max(12).nullable(),
  }),
  operativa: z.object({
    moscow_tasks: z.array(moscowTaskSchema),
  }),
  arsenal: z.object({
    resourceIds: z.array(z.string()),
    powerIds: z.array(z.string()),
  }),
  telemetria: z.object({
    energyCost: z.number().int().min(1).max(12),
    origin: z.literal("ideate"),
  }),
});

export type MatrixSeed = z.infer<typeof matrixSeedSchema>;

export const ideateResponseSchema = ideateLlmOutputSchema.extend({
  title: z.string(),
  resolved_mentions: z.array(resolvedMentionSchema),
  amazonA: z.array(ideateAmazonASchema),
  matrix_seed: matrixSeedSchema,
});

export type IdeateResponse = z.infer<typeof ideateResponseSchema>;

export function normalizeCampoSlugSuggestion(
  value: string | undefined,
): string {
  if (value && isCampoSlug(value)) return value;
  return DEFAULT_CAMPO_SLUG;
}

export function normalizeTipoSuggestion(
  value: ProjectTipo | undefined,
): ProjectTipo | null {
  if (!value) return null;
  return PROJECT_TIPOS.includes(value) ? value : null;
}

export function emptyIdeateLlmOutput(title: string): IdeateLlmOutput {
  return ideateLlmOutputSchema.parse({
    short_pitch: title.trim() || "Proyecto sin pitch",
    domain: "general",
    moscow_tasks: [],
    suggested_energy_cost: 6,
    suggested_mago_phase: "mente",
    suggested_person_labels: [],
    suggested_tags: [],
  });
}
