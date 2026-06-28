import {
  BLOQUE_PRIORITY_INDEX,
  GOLDEN_TASK_COUNT,
} from "./constants";
import type {
  BloquePrioridad,
  JornadaTask,
  ScheduledEvent,
} from "./types";

export function clampAxis(value: number): number {
  return Math.min(12, Math.max(1, Math.round(value)));
}

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getNowMinutes(date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function isEventActive(
  event: ScheduledEvent,
  nowMinutes: number,
  closedEventIds: string[],
): boolean {
  if (closedEventIds.includes(event.id)) return false;
  const start = parseTimeToMinutes(event.horaInicio);
  const end = parseTimeToMinutes(event.horaFin);
  return nowMinutes >= start && nowMinutes < end;
}

export function findActiveEvent(
  events: ScheduledEvent[],
  nowMinutes: number,
  closedEventIds: string[],
): ScheduledEvent | null {
  return (
    events.find((event) => isEventActive(event, nowMinutes, closedEventIds)) ??
    null
  );
}

export function findNextEvent(
  events: ScheduledEvent[],
  nowMinutes: number,
  closedEventIds: string[],
): ScheduledEvent | null {
  const upcoming = events
    .filter((event) => !closedEventIds.includes(event.id))
    .filter((event) => parseTimeToMinutes(event.horaInicio) > nowMinutes)
    .sort(
      (a, b) =>
        parseTimeToMinutes(a.horaInicio) - parseTimeToMinutes(b.horaInicio),
    );

  return upcoming[0] ?? null;
}

export function getBlockProgress(
  event: ScheduledEvent,
  nowMinutes: number,
): number {
  const start = parseTimeToMinutes(event.horaInicio);
  const end = parseTimeToMinutes(event.horaFin);
  const span = Math.max(end - start, 1);
  return Math.min(1, Math.max(0, (nowMinutes - start) / span));
}

export function computeTaskCurrency(ejeY: number, ejeZ: number): number {
  const y = clampAxis(ejeY);
  const z = clampAxis(ejeZ);
  return Number((y / z).toFixed(2));
}

export function compareTasksByGoldenLaw(a: JornadaTask, b: JornadaTask): number {
  const blockDiff =
    BLOQUE_PRIORITY_INDEX[a.ejeX] - BLOQUE_PRIORITY_INDEX[b.ejeX];
  if (blockDiff !== 0) return blockDiff;

  const ratioDiff =
    computeTaskCurrency(b.ejeY, b.ejeZ) - computeTaskCurrency(a.ejeY, a.ejeZ);
  if (ratioDiff !== 0) return ratioDiff;

  return b.ejeY - a.ejeY;
}

export function selectGoldenTasks(tasks: JornadaTask[]): JornadaTask[] {
  return tasks
    .filter((task) => !task.completada)
    .sort(compareTasksByGoldenLaw)
    .slice(0, GOLDEN_TASK_COUNT);
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatMinutesRemaining(targetMs: number, now = Date.now()): string {
  const remaining = Math.max(0, targetMs - now);
  const minutes = Math.ceil(remaining / 60_000);
  return `${minutes} min`;
}

export function bloqueLabel(bloque: BloquePrioridad): string {
  return bloque;
}
