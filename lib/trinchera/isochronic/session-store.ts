import {
  DEFAULT_ISOCHRONIC_PARAMS,
  ISOCHRONIC_STORAGE_KEY,
  VOLUME_MAX,
  VOLUME_MIN,
  PULSE_MAX,
  PULSE_MIN,
} from "@/lib/trinchera/isochronic/constants";
import type { IsochronicSession } from "@/lib/trinchera/isochronic/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readIsochronicSession(): IsochronicSession {
  if (typeof window === "undefined") {
    return {
      ...DEFAULT_ISOCHRONIC_PARAMS,
      accumulatedPracticeSec: 0,
    };
  }

  try {
    const raw = window.localStorage.getItem(ISOCHRONIC_STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_ISOCHRONIC_PARAMS,
        accumulatedPracticeSec: 0,
      };
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return {
        ...DEFAULT_ISOCHRONIC_PARAMS,
        accumulatedPracticeSec: 0,
      };
    }

    const pulseHz =
      typeof parsed.pulseHz === "number"
        ? clamp(parsed.pulseHz, PULSE_MIN, PULSE_MAX)
        : DEFAULT_ISOCHRONIC_PARAMS.pulseHz;

    const volume =
      typeof parsed.volume === "number"
        ? clamp(parsed.volume, VOLUME_MIN, VOLUME_MAX)
        : DEFAULT_ISOCHRONIC_PARAMS.volume;

    const accumulatedPracticeSec =
      typeof parsed.accumulatedPracticeSec === "number" &&
      parsed.accumulatedPracticeSec >= 0
        ? Math.floor(parsed.accumulatedPracticeSec)
        : 0;

    return { pulseHz, volume, accumulatedPracticeSec };
  } catch {
    return {
      ...DEFAULT_ISOCHRONIC_PARAMS,
      accumulatedPracticeSec: 0,
    };
  }
}

export function writeIsochronicSession(session: IsochronicSession): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ISOCHRONIC_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore quota / private mode
  }
}

export function persistIsochronicParams(
  pulseHz: number,
  volume: number,
  accumulatedPracticeSec: number,
): void {
  writeIsochronicSession({
    pulseHz: clamp(pulseHz, PULSE_MIN, PULSE_MAX),
    volume: clamp(volume, VOLUME_MIN, VOLUME_MAX),
    accumulatedPracticeSec: Math.max(0, Math.floor(accumulatedPracticeSec)),
  });
}
