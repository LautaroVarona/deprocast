import { normalizeDayStart } from "@/lib/pendientes/day";
import type { TrailingCommand } from "@/lib/trailing-commands/types";

/** Resuelve la fecha objetivo de un comando ejecutable. */
export function resolveCommandTargetDay(
  command: Pick<
    TrailingCommand,
    "targetDayOffset" | "weekday"
  >,
  base = new Date(),
): Date {
  const day = normalizeDayStart(base);

  if (command.weekday !== undefined) {
    const current = day.getDay();
    let diff = command.weekday - current;
    if (diff <= 0) diff += 7;
    day.setDate(day.getDate() + diff);
    return day;
  }

  const offset = command.targetDayOffset ?? "today";
  if (offset === "yesterday") {
    day.setDate(day.getDate() - 1);
  } else if (offset === "tomorrow") {
    day.setDate(day.getDate() + 1);
  }

  return day;
}

/** Combina fecha + hora opcional en ISO para calendario. */
export function resolveCommandOccurredAt(
  command: Pick<TrailingCommand, "targetDayOffset" | "weekday" | "timeOfDay">,
  base = new Date(),
): Date {
  const day = resolveCommandTargetDay(command, base);

  if (command.timeOfDay) {
    const [hours, minutes] = command.timeOfDay.split(":").map(Number);
    day.setHours(hours, minutes, 0, 0);
    return day;
  }

  day.setHours(9, 0, 0, 0);
  return day;
}
