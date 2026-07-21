import type { HealthRecordDto } from "@/lib/events/types";
import { formatElapsedCompact } from "@/components/salud/lib/fasting";
import type { ActivityMetricType } from "@/components/salud/types";
import { recordToActividad } from "@/components/salud/types";

export type ExerciseTag = {
  label: string;
  className: string;
};

export function classifyExercise(description: string): ExerciseTag {
  const text = description.toLowerCase();

  if (
    /hiit|interval|sprint|tabata|burpee|crossfit/.test(text)
  ) {
    return {
      label: "#HIIT",
      className: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    };
  }

  if (
    /fuerza|gym|gimnasio|peso|pecho|pierna|sentadilla|press|tríceps|triceps|bíceps|biceps|musculación|musculacion/.test(
      text,
    )
  ) {
    return {
      label: "#Fuerza",
      className: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    };
  }

  if (
    /caminata|caminar|liss|trote suave|elíptica|eliptica|bici suave|yoga|stretch/.test(
      text,
    )
  ) {
    return {
      label: "#LISS / Caminata",
      className: "border-lime-500/30 bg-lime-500/10 text-lime-300",
    };
  }

  return {
    label: "#Actividad",
    className: "border-border bg-muted text-foreground/80",
  };
}

export function getWeeklySessionCount(
  records: HealthRecordDto[],
  now = new Date(),
): number {
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  return records.filter(
    (record) =>
      record.pillar === "rendimiento" &&
      new Date(record.occurredAt).getTime() >= weekAgo.getTime(),
  ).length;
}

export function formatLastActivity(
  records: HealthRecordDto[],
  now = new Date(),
): string | null {
  const sorted = records
    .filter((record) => record.pillar === "rendimiento")
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );

  if (sorted.length === 0) return null;

  const latest = sorted[0];
  const actividad = recordToActividad(latest);
  if (!actividad) return null;

  const occurred = new Date(latest.occurredAt);
  const dayKey = occurred.toDateString();
  const todayKey = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayLabel =
    dayKey === todayKey
      ? "Hoy"
      : dayKey === yesterday.toDateString()
        ? "Ayer"
        : occurred.toLocaleDateString("es-AR", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });

  const metric =
    actividad.metricType === "duration_min"
      ? `${actividad.metricValue} min`
      : actividad.metricType === "distance_km"
        ? `${actividad.metricValue} km`
        : `Int. ${actividad.metricValue}/10`;

  const shortDesc =
    actividad.descripcion.length > 28
      ? `${actividad.descripcion.slice(0, 28)}…`
      : actividad.descripcion;

  return `${dayLabel}: ${shortDesc} (${metric})`;
}

export function formatActivityMetricShort(
  metricType: ActivityMetricType,
  metricValue: number,
): string {
  switch (metricType) {
    case "duration_min":
      return `${metricValue} min`;
    case "distance_km":
      return `${metricValue} km`;
    case "intensity":
      return `${metricValue}/10`;
    default:
      return String(metricValue);
  }
}

export function formatActivityTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatActivityDay(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today) return "Hoy";
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}
