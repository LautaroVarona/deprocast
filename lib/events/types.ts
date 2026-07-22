import { z } from "zod";
import {
  BLOCK_KINDS,
  ECOSYSTEM_AREAS,
  EXECUTION_STATUSES,
  type BlockKind,
  type EcosystemArea,
  type ExecutionStatus,
} from "@/lib/calendario/constants";

export const EVENT_SOURCES = ["chat", "journal", "manual", "import", "audio"] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];

export const EVENT_PILLARS = [
  "rendimiento",
  "combustible",
  "recuperacion",
  "estado_base",
  "proyecto",
  "general",
] as const;
export type EventPillar = (typeof EVENT_PILLARS)[number];

export const HEALTH_PILLARS = [
  "rendimiento",
  "combustible",
  "recuperacion",
  "estado_base",
] as const;
export type HealthPillar = (typeof HEALTH_PILLARS)[number];

export const EVENT_STATUSES = ["proposed", "confirmed", "rejected"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_LINK_ENTITY_TYPES = [
  "proyecto",
  "health_pillar",
  "persona",
  "journal",
  "chat_message",
  "campo",
  "transcript",
] as const;
export type EventLinkEntityType = (typeof EVENT_LINK_ENTITY_TYPES)[number];

export const EVENT_LINK_ROLES = ["primary", "affected_by", "related"] as const;
export type EventLinkRole = (typeof EVENT_LINK_ROLES)[number];

/** Coerce null/empty/invalid intensity → "media". */
const healthIntensityMetricSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (value === "baja" || value === "media" || value === "alta") return value;
  return "media";
}, z.enum(["baja", "media", "alta"]).optional());

export const rendimientoMetricsSchema = z.object({
  blockType: z.string().optional(),
  zone: z.string().optional(),
  durationMin: z.number().optional(),
  intensity: healthIntensityMetricSchema,
  metricType: z.enum(["duration_min", "distance_km", "intensity"]).optional(),
  metricValue: z.number().optional(),
});

export const combustibleMetricsSchema = z.object({
  kind: z.enum(["ayuno", "agua", "suplemento", "desviacion", "comida"]),
  value: z.union([z.number(), z.string()]).optional(),
  unit: z.string().optional(),
  note: z.string().optional(),
  modality: z
    .enum(["texto", "audio", "imagen", "text", "table", "image"])
    .optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.string().optional(),
        unit: z.string().optional(),
        calories: z.number().optional(),
        protein: z.number().optional(),
        carbs: z.number().optional(),
        fat: z.number().optional(),
      }),
    )
    .optional(),
  totals: z
    .object({
      calories: z.number().optional(),
      protein: z.number().optional(),
      carbs: z.number().optional(),
      fat: z.number().optional(),
    })
    .optional(),
  confidence: z.number().min(0).max(1).optional(),
  analysisNotes: z.string().optional(),
  rawTranscript: z.string().optional(),
  tachoPath: z.string().optional(),
  attachmentMimeType: z.string().optional(),
  analyzedBy: z.string().optional(),
});

export const recuperacionMetricsSchema = z.object({
  sleepHours: z.number().optional(),
  quality: z.number().min(1).max(10).optional(),
  deepMin: z.number().optional(),
  hrv: z.number().optional(),
  restingHr: z.number().optional(),
});

export const estadoBaseMetricsSchema = z.object({
  period: z.enum(["am", "pm"]),
  energy: z.number().min(1).max(10),
  focus: z.number().min(1).max(10),
  clarity: z.number().min(1).max(10),
});

export const healthMetricsByPillar = {
  rendimiento: rendimientoMetricsSchema,
  combustible: combustibleMetricsSchema,
  recuperacion: recuperacionMetricsSchema,
  estado_base: estadoBaseMetricsSchema,
} as const;

export type RendimientoMetrics = z.infer<typeof rendimientoMetricsSchema>;
export type CombustibleMetrics = z.infer<typeof combustibleMetricsSchema>;
export type RecuperacionMetrics = z.infer<typeof recuperacionMetricsSchema>;
export type EstadoBaseMetrics = z.infer<typeof estadoBaseMetricsSchema>;

export type HealthMetrics =
  | RendimientoMetrics
  | CombustibleMetrics
  | RecuperacionMetrics
  | EstadoBaseMetrics;

export const eventLinkInputSchema = z.object({
  entityType: z.enum(EVENT_LINK_ENTITY_TYPES),
  entityId: z.string().min(1),
  entityLabel: z.string().optional(),
  linkRole: z.enum(EVENT_LINK_ROLES).optional(),
});

export const proposedEventInputSchema = z.object({
  content: z.string().min(1),
  pillar: z.enum(EVENT_PILLARS),
  structuredData: z.record(z.unknown()).default({}),
  summary: z.string().optional(),
  links: z.array(eventLinkInputSchema).default([]),
});

/** Ubicación geográfica opcional embebida en structuredData.location */
export const eventLocationSchema = z.object({
  locationId: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  label: z.string().optional(),
});

export const createProposedEventsInputSchema = z.object({
  source: z.enum(EVENT_SOURCES),
  sourceRef: z.string().optional(),
  occurredAt: z.coerce.date(),
  correlationId: z.string().optional(),
  events: z.array(proposedEventInputSchema).min(1),
});

export type EventLinkInput = z.infer<typeof eventLinkInputSchema>;
export type ProposedEventInput = z.infer<typeof proposedEventInputSchema>;
export type CreateProposedEventsInput = z.infer<
  typeof createProposedEventsInputSchema
>;

export type ContextEventLinkDto = {
  id: string;
  entityType: EventLinkEntityType;
  entityId: string;
  entityLabel: string | null;
  linkRole: EventLinkRole;
  createdAt: string;
};

export type ContextEventDto = {
  id: string;
  occurredAt: string;
  source: EventSource;
  sourceRef: string | null;
  content: string;
  structuredData: Record<string, unknown>;
  pillar: EventPillar;
  status: EventStatus;
  correlationId: string | null;
  blockKind: BlockKind;
  actionCost: number | null;
  executionStatus: ExecutionStatus;
  ecosystemArea: EcosystemArea | null;
  endsAt: string | null;
  durationMin: number | null;
  createdAt: string;
  links: ContextEventLinkDto[];
};

export { BLOCK_KINDS, ECOSYSTEM_AREAS, EXECUTION_STATUSES };
export type { BlockKind, EcosystemArea, ExecutionStatus };

export type HealthRecordDto = {
  id: string;
  pillar: HealthPillar;
  occurredAt: string;
  summary: string;
  metrics: Record<string, unknown>;
  sourceEventId: string | null;
  createdAt: string;
};

export const llmExtractedEventSchema = z.object({
  pillar: z.enum(EVENT_PILLARS),
  summary: z.string(),
  structuredData: z.record(z.unknown()).default({}),
  projectLinks: z
    .array(
      z.object({
        projectId: z.string().optional(),
        projectLabel: z.string(),
        note: z.string().optional(),
      }),
    )
    .default([]),
});

export const llmExtractionResultSchema = z.object({
  events: z.array(llmExtractedEventSchema),
});

export type LlmExtractedEvent = z.infer<typeof llmExtractedEventSchema>;
export type LlmExtractionResult = z.infer<typeof llmExtractionResultSchema>;

export function isEventSource(value: unknown): value is EventSource {
  return typeof value === "string" && EVENT_SOURCES.includes(value as EventSource);
}

export function isEventPillar(value: unknown): value is EventPillar {
  return typeof value === "string" && EVENT_PILLARS.includes(value as EventPillar);
}

export function isHealthPillar(value: unknown): value is HealthPillar {
  return typeof value === "string" && HEALTH_PILLARS.includes(value as HealthPillar);
}

export function isEventStatus(value: unknown): value is EventStatus {
  return typeof value === "string" && EVENT_STATUSES.includes(value as EventStatus);
}

export function validateHealthMetrics(
  pillar: HealthPillar,
  metrics: unknown,
): Record<string, unknown> {
  const schema = healthMetricsByPillar[pillar];
  return schema.parse(metrics) as Record<string, unknown>;
}

export const PILLAR_LABELS: Record<EventPillar, string> = {
  rendimiento: "Rendimiento Físico",
  combustible: "Combustible",
  recuperacion: "Recuperación",
  estado_base: "Estado Base",
  proyecto: "Proyecto",
  general: "General",
};
