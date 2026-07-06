import "server-only";

import type { HealthRecordDto } from "@/lib/events/types";
import type { CampamentoEnergy } from "@/lib/ludus/types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function inferWokeAt6Am(records: HealthRecordDto[], now = new Date()): boolean {
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const record of records) {
    if (record.pillar !== "estado_base") continue;
    const metrics = record.metrics as { period?: string };
    if (metrics.period !== "am") continue;

    const occurred = new Date(record.occurredAt);
    if (!isSameDay(occurred, today) && !isSameDay(occurred, yesterday)) continue;

    const hour = occurred.getHours();
    const minute = occurred.getMinutes();
    if (hour < 6 || (hour === 6 && minute <= 30)) return true;
  }

  return false;
}

export function computeCampamentoEnergy(
  records: HealthRecordDto[],
  goldenPrioritiesAssigned: number,
  now = new Date(),
): CampamentoEnergy {
  const weekAgo = new Date(now.getTime() - WEEK_MS);

  const sleepHours = records
    .filter(
      (record) =>
        record.pillar === "recuperacion" &&
        new Date(record.occurredAt) >= weekAgo,
    )
    .map((record) => {
      const metrics = record.metrics as { sleepHours?: number };
      return typeof metrics.sleepHours === "number" ? metrics.sleepHours : null;
    })
    .filter((value): value is number => value !== null && value > 0);

  const avgSleepHours = average(sleepHours);
  const wokeAt6Am = inferWokeAt6Am(records, now);

  const recentEstadoBase = records.filter(
    (record) =>
      record.pillar === "estado_base" &&
      new Date(record.occurredAt) >= weekAgo,
  );

  const energyScores = recentEstadoBase
    .map((record) => {
      const metrics = record.metrics as { energy?: number };
      return typeof metrics.energy === "number" ? metrics.energy : null;
    })
    .filter((value): value is number => value !== null);

  const avgEnergyScore = average(energyScores);

  let energyPercent = 55;

  if (avgSleepHours !== null) {
    if (avgSleepHours >= 7.5) energyPercent += 25;
    else if (avgSleepHours >= 6.5) energyPercent += 12;
    else if (avgSleepHours >= 5.5) energyPercent += 0;
    else energyPercent -= 20;
  }

  if (avgEnergyScore !== null) {
    energyPercent += (avgEnergyScore - 5) * 4;
  }

  if (wokeAt6Am) energyPercent += 8;

  energyPercent = Math.max(0, Math.min(100, Math.round(energyPercent)));

  const lowTelemetry =
    (avgSleepHours !== null && avgSleepHours < 6) || energyPercent < 45;

  const maxGoldenPrioritiesPerDay = lowTelemetry ? 1 : 3;

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekLabel = weekStart.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });

  return {
    energyPercent,
    avgSleepHours: avgSleepHours !== null ? Math.round(avgSleepHours * 10) / 10 : null,
    wokeAt6Am,
    lowTelemetry,
    maxGoldenPrioritiesPerDay,
    goldenPrioritiesAssigned,
    canAssignMoreGolden: goldenPrioritiesAssigned < maxGoldenPrioritiesPerDay,
    weekLabel,
  };
}
