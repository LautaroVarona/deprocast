/** Tipos unificados del Motor de Triage HITL (cola de entropía). */

export const TRIAGE_ENTITY_TYPES = [
  "pending_task",
  "quantomo",
  "kg_edge",
] as const;

export type TriageEntityType = (typeof TRIAGE_ENTITY_TYPES)[number];

export type TriageOriginDto = {
  channel: string;
  label: string;
  timestamp: string | null;
  locationName?: string | null;
};

export type TriageCardDto = {
  id: string;
  entityType: TriageEntityType;
  title: string;
  subtitle: string | null;
  preview: string | null;
  origin: TriageOriginDto;
  /** Escala Hermética 1–12 */
  gravity: number;
  createdAt: string;
};

export function isTriageEntityType(value: string): value is TriageEntityType {
  return (TRIAGE_ENTITY_TYPES as readonly string[]).includes(value);
}

export function clampHermeticGravity(value: number): number {
  if (!Number.isFinite(value)) return 6;
  return Math.min(12, Math.max(1, Math.round(value)));
}
