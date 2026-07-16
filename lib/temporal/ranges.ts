import { normalizeDayStart } from "@/lib/pendientes/day";

const DAY_MS = 86_400_000;

export function weekRangeForDate(anchor: Date) {
  const base = normalizeDayStart(anchor);
  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const from = new Date(base);
  from.setDate(base.getDate() + mondayOffset);
  const to = new Date(from);
  to.setDate(from.getDate() + 7);
  return { from, to };
}

export function monthRange(year: number, month: number) {
  const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const to = new Date(year, month, 1, 0, 0, 0, 0);
  return { from, to };
}

export function parseIsoDateParam(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function toIsoDayKey(date: Date): string {
  return normalizeDayStart(date).toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}
