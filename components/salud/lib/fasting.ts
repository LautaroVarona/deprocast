import type { HealthRecordDto } from "@/lib/events/types";

export const FASTING_GOAL_HOURS = 16;

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function formatElapsedCompact(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function getMealRecords(
  records: HealthRecordDto[],
): HealthRecordDto[] {
  return records
    .filter(
      (record) =>
        record.pillar === "combustible" && record.metrics.kind === "comida",
    )
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
}

export function getLastMealAt(
  records: HealthRecordDto[],
  now = new Date(),
): Date | null {
  const meals = getMealRecords(records);
  if (meals.length === 0) return null;

  const lastMeal = new Date(meals[0].occurredAt);
  if (lastMeal.getTime() > now.getTime()) return now;
  return lastMeal;
}

export function getFastingElapsedMs(
  records: HealthRecordDto[],
  now = new Date(),
): number | null {
  const lastMealAt = getLastMealAt(records, now);
  if (!lastMealAt) return null;
  return now.getTime() - lastMealAt.getTime();
}

export function getFastingProgress(
  elapsedMs: number,
  goalHours = FASTING_GOAL_HOURS,
): number {
  const goalMs = goalHours * 60 * 60 * 1000;
  return Math.min(100, (elapsedMs / goalMs) * 100);
}

export function getFastingTone(hours: number): "warm" | "success" {
  return hours >= 14 ? "success" : "warm";
}

export function formatMealTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export type MealWithBrokenFast = {
  id: string;
  descripcion: string;
  occurredAt: string;
  modality: "texto" | "audio" | "imagen";
  attachmentLabel?: string;
  brokenFastMs: number | null;
  caloriesLabel?: string;
};

export function buildMealHistory(
  records: HealthRecordDto[],
): MealWithBrokenFast[] {
  const meals = getMealRecords(records).slice().reverse();

  return meals.map((meal, index) => {
    const note =
      typeof meal.metrics.note === "string" ? meal.metrics.note : undefined;
    const attachmentMatch = note?.match(/adjunto:([^;]+)/);
    const modalityRaw = meal.metrics.modality;
    const modality =
      modalityRaw === "audio" || modalityRaw === "imagen"
        ? modalityRaw
        : "texto";

    let brokenFastMs: number | null = null;
    if (index > 0) {
      const prev = new Date(meals[index - 1].occurredAt).getTime();
      const current = new Date(meal.occurredAt).getTime();
      brokenFastMs = Math.max(0, current - prev);
    }

    const totals = meal.metrics.totals;
    let caloriesLabel: string | undefined;
    if (totals && typeof totals === "object" && "calories" in totals) {
      const cal = (totals as { calories?: number }).calories;
      if (typeof cal === "number") caloriesLabel = `${Math.round(cal)} kcal`;
    }

    return {
      id: meal.id,
      descripcion: meal.summary,
      occurredAt: meal.occurredAt,
      modality,
      attachmentLabel: attachmentMatch?.[1]?.trim(),
      brokenFastMs,
      caloriesLabel,
    };
  });
}
