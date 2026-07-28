import type { MissionCardDto } from "@/lib/calendario/types";

export const MISSION_DRAG_TYPE = "mission-card" as const;
export const SLOT_DROP_TYPE = "time-slot" as const;

export type MissionDragData = {
  type: typeof MISSION_DRAG_TYPE;
  card: MissionCardDto;
};

export type TimeSlotDropData = {
  type: typeof SLOT_DROP_TYPE;
  dayKey: string;
  hour: number;
};

export function missionDragId(cardId: string): string {
  return `mission:${cardId}`;
}

export function timeSlotId(dayKey: string, hour: number): string {
  return `slot:${dayKey}:${hour}`;
}

export function parseTimeSlotId(
  id: string,
): { dayKey: string; hour: number } | null {
  if (!id.startsWith("slot:")) return null;
  const parts = id.split(":");
  if (parts.length !== 3) return null;
  const hour = Number(parts[2]);
  if (!parts[1] || Number.isNaN(hour)) return null;
  return { dayKey: parts[1], hour };
}

export function isMissionDragData(data: unknown): data is MissionDragData {
  if (!data || typeof data !== "object") return false;
  const d = data as MissionDragData;
  return d.type === MISSION_DRAG_TYPE && !!d.card;
}
