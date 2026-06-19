import { getDataPath } from "@/lib/runtime-paths";
import path from "node:path";

export const JOURNAL_ROOT = getDataPath("journal");

export function getMonthDirName(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getMonthDir(year: number, month: number): string {
  return path.join(JOURNAL_ROOT, getMonthDirName(year, month));
}

export function formatJournalTimestamp(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}-${h}${min}${s}`;
}

export function formatFechaRegistro(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

export function formatShortTitleDate(date = new Date()): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(date);
}
