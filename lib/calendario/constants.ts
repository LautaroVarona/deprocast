export const BLOCK_KINDS = ["IMMUTABLE", "ROUTINE", "SUGGESTION"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

export const EXECUTION_STATUSES = [
  "scheduled",
  "confirmed_day",
  "skipped",
  "executed",
  "coagulated",
] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export const ECOSYSTEM_AREAS = [
  "legal",
  "salud",
  "finanzas",
  "tecnologia",
  "arte",
  "meta",
] as const;
export type EcosystemArea = (typeof ECOSYSTEM_AREAS)[number];

export const MISSION_CARD_SOURCES = [
  "pending_task",
  "microtask",
  "proposed_event",
] as const;
export type MissionCardSource = (typeof MISSION_CARD_SOURCES)[number];

export const BLOCK_KIND_LABELS: Record<BlockKind, string> = {
  IMMUTABLE: "Infraestructura fija",
  ROUTINE: "Bucle de vitalidad",
  SUGGESTION: "Carta de misión",
};

export const ECOSYSTEM_AREA_LABELS: Record<EcosystemArea, string> = {
  legal: "Legal",
  salud: "Salud",
  finanzas: "Finanzas",
  tecnologia: "Tecnología",
  arte: "Arte / Entretenimiento",
  meta: "Meta",
};

export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  scheduled: "Programado",
  confirmed_day: "Confirmado hoy",
  skipped: "Saltado",
  executed: "Ejecutado",
  coagulated: "Coagulado",
};

/** Preview de Señal al coagular (anticipación, no acreditación). */
export const COAGULATE_SIGNAL_FACTOR = 0.5;

export const MICROTASK_MAX_MIN = 15;
