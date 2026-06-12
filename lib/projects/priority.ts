import { MAX_BASE_WEIGHT, MIN_BASE_WEIGHT } from "@/lib/document-constants";

export function clampScale(value: number): number {
  return Math.min(MAX_BASE_WEIGHT, Math.max(MIN_BASE_WEIGHT, Math.round(value)));
}

export function isHighPriorityProject(prioridad: number, impacto: number): boolean {
  return prioridad >= 10 || impacto >= 10;
}
