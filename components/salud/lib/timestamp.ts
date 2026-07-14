import type { TimestampMode } from "@/components/salud/types";

export function resolveOccurredAt(
  mode: TimestampMode,
  specificTime: string,
  now = new Date(),
): Date {
  if (mode === "now") {
    return now;
  }

  if (mode === "30min") {
    return new Date(now.getTime() - 30 * 60 * 1000);
  }

  const [hours, minutes] = specificTime.split(":").map(Number);
  const resolved = new Date(now);
  resolved.setSeconds(0, 0);
  resolved.setHours(hours ?? 0, minutes ?? 0, 0, 0);

  if (resolved.getTime() > now.getTime()) {
    resolved.setDate(resolved.getDate() - 1);
  }

  return resolved;
}
