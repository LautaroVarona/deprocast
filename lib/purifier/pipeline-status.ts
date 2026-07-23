/** Máquina de estados del pipeline Ingesta → Purificación → Aduana → Molecular. */

export const PIPELINE_STATUSES = [
  "prima_materia",
  "pendiente_purificacion",
  "pendiente_validacion",
  "molecularizado",
] as const;

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export const PIPELINE_STATUS_LABELS: Record<PipelineStatus, string> = {
  prima_materia: "Prima materia",
  pendiente_purificacion: "Pendiente de purificación",
  pendiente_validacion: "Pendiente de validación",
  molecularizado: "Molecularizado",
};

/** Estados visibles en la cola HITL de `/validar` (Aduana). */
export const ADUANA_QUEUE_STATUSES: readonly PipelineStatus[] = [
  "pendiente_validacion",
] as const;

const TRANSITIONS: Record<PipelineStatus, readonly PipelineStatus[]> = {
  prima_materia: ["pendiente_purificacion"],
  pendiente_purificacion: ["pendiente_validacion"],
  pendiente_validacion: ["molecularizado"],
  molecularizado: [],
};

export function isPipelineStatus(value: unknown): value is PipelineStatus {
  return (
    typeof value === "string" &&
    (PIPELINE_STATUSES as readonly string[]).includes(value)
  );
}

export function canTransitionPipeline(
  from: PipelineStatus,
  to: PipelineStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertPipelineTransition(
  from: PipelineStatus,
  to: PipelineStatus,
): void {
  if (!canTransitionPipeline(from, to)) {
    throw new Error(
      `Transición de pipeline inválida: ${from} → ${to}`,
    );
  }
}

export function normalizePipelineStatus(
  value: unknown,
  fallback: PipelineStatus = "pendiente_validacion",
): PipelineStatus {
  if (isPipelineStatus(value)) return value;
  return fallback;
}
