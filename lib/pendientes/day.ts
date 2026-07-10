import type { DayOffset } from "@/lib/pendientes/types";

export function normalizeDayStart(date: Date = new Date()): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function resolveDayOffset(offset: DayOffset, base = new Date()): Date {
  const day = normalizeDayStart(base);
  if (offset === "yesterday") {
    day.setDate(day.getDate() - 1);
  } else if (offset === "tomorrow") {
    day.setDate(day.getDate() + 1);
  }
  return day;
}

export function dayOffsetFromDate(
  targetDay: Date,
  base = new Date(),
): DayOffset {
  const normalized = normalizeDayStart(targetDay).getTime();
  const today = normalizeDayStart(base).getTime();
  const diff = Math.round((normalized - today) / 86_400_000);

  if (diff <= -1) return "yesterday";
  if (diff >= 1) return "tomorrow";
  return "today";
}

export function dayRangeForOffset(offset: DayOffset, base = new Date()) {
  const start = resolveDayOffset(offset, base);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
