import { MAX_BASE_WEIGHT, MIN_BASE_WEIGHT } from "@/lib/document-constants";

const MIN_SUM = 2;
const MAX_SUM = 10;

/**
 * Mapea Prioridad (1-5) + Impacto (1-5) al rango base_weight 1–12 de DeProcast.
 * Prioridad 5 + Impacto 5 → 12/12.
 */
export function calculateBaseWeight(prioridad: number, impacto: number): number {
  const sum = prioridad + impacto;
  const clampedSum = Math.min(MAX_SUM, Math.max(MIN_SUM, sum));
  const normalized =
    MIN_BASE_WEIGHT +
    ((clampedSum - MIN_SUM) / (MAX_SUM - MIN_SUM)) *
      (MAX_BASE_WEIGHT - MIN_BASE_WEIGHT);

  return Math.round(normalized);
}

export function isHighPriorityWeight(baseWeight: number): boolean {
  return baseWeight >= 10;
}
