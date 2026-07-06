import {
  BEAT_MAX,
  BEAT_MIN,
  BREATHING_SEC_MAX,
  BREATHING_SEC_MIN,
  CARRIER_MAX,
  CARRIER_MIN,
  DB_MAX,
  DB_MIN,
  DEFAULT_SOUND_LAB_PARAMS,
  ISO_CARRIER_MAX,
  ISO_CARRIER_MIN,
  MEDITATIVE_BASE_MAX,
  MEDITATIVE_BASE_MIN,
  PULSE_MAX,
  PULSE_MIN,
  SOUND_LAB_STORAGE_KEY,
} from "@/lib/trinchera/sound-lab/constants";
import type {
  SoundLabMode,
  SoundLabSession,
} from "@/lib/trinchera/sound-lab/types";

const VALID_MODES = new Set<SoundLabMode>([
  "isochronic",
  "binaural",
  "meditative",
]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export function gainToDb(gain: number): number {
  return 20 * Math.log10(Math.max(gain, 1e-8));
}

export function readSoundLabSession(): SoundLabSession {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SOUND_LAB_PARAMS, accumulatedPracticeSec: 0 };
  }

  try {
    const raw = window.localStorage.getItem(SOUND_LAB_STORAGE_KEY);
    if (!raw) {
      const legacy = window.localStorage.getItem(
        "deprocast:trinchera:isochronic",
      );
      if (legacy) {
        const parsed: unknown = JSON.parse(legacy);
        if (isRecord(parsed)) {
          const volumeDb =
            typeof parsed.volume === "number"
              ? clamp(gainToDb(parsed.volume), DB_MIN, DB_MAX)
              : DEFAULT_SOUND_LAB_PARAMS.volumeDb;
          return {
            ...DEFAULT_SOUND_LAB_PARAMS,
            volumeDb,
            pulseHz:
              typeof parsed.pulseHz === "number"
                ? clamp(parsed.pulseHz, PULSE_MIN, PULSE_MAX)
                : DEFAULT_SOUND_LAB_PARAMS.pulseHz,
            accumulatedPracticeSec:
              typeof parsed.accumulatedPracticeSec === "number"
                ? Math.floor(parsed.accumulatedPracticeSec)
                : 0,
          };
        }
      }
      return { ...DEFAULT_SOUND_LAB_PARAMS, accumulatedPracticeSec: 0 };
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return { ...DEFAULT_SOUND_LAB_PARAMS, accumulatedPracticeSec: 0 };
    }

    const mode = VALID_MODES.has(parsed.mode as SoundLabMode)
      ? (parsed.mode as SoundLabMode)
      : DEFAULT_SOUND_LAB_PARAMS.mode;

    return {
      mode,
      volumeDb:
        typeof parsed.volumeDb === "number"
          ? clamp(parsed.volumeDb, DB_MIN, DB_MAX)
          : DEFAULT_SOUND_LAB_PARAMS.volumeDb,
      pulseHz:
        typeof parsed.pulseHz === "number"
          ? clamp(parsed.pulseHz, PULSE_MIN, PULSE_MAX)
          : DEFAULT_SOUND_LAB_PARAMS.pulseHz,
      isochronicCarrierHz:
        typeof parsed.isochronicCarrierHz === "number"
          ? clamp(parsed.isochronicCarrierHz, ISO_CARRIER_MIN, ISO_CARRIER_MAX)
          : DEFAULT_SOUND_LAB_PARAMS.isochronicCarrierHz,
      carrierHz:
        typeof parsed.carrierHz === "number"
          ? clamp(parsed.carrierHz, CARRIER_MIN, CARRIER_MAX)
          : DEFAULT_SOUND_LAB_PARAMS.carrierHz,
      beatHz:
        typeof parsed.beatHz === "number"
          ? clamp(parsed.beatHz, BEAT_MIN, BEAT_MAX)
          : DEFAULT_SOUND_LAB_PARAMS.beatHz,
      meditativeBaseHz:
        typeof parsed.meditativeBaseHz === "number"
          ? clamp(parsed.meditativeBaseHz, MEDITATIVE_BASE_MIN, MEDITATIVE_BASE_MAX)
          : DEFAULT_SOUND_LAB_PARAMS.meditativeBaseHz,
      breathingSecPerPhase:
        typeof parsed.breathingSecPerPhase === "number"
          ? clamp(
              parsed.breathingSecPerPhase,
              BREATHING_SEC_MIN,
              BREATHING_SEC_MAX,
            )
          : DEFAULT_SOUND_LAB_PARAMS.breathingSecPerPhase,
      accumulatedPracticeSec:
        typeof parsed.accumulatedPracticeSec === "number" &&
        parsed.accumulatedPracticeSec >= 0
          ? Math.floor(parsed.accumulatedPracticeSec)
          : 0,
    };
  } catch {
    return { ...DEFAULT_SOUND_LAB_PARAMS, accumulatedPracticeSec: 0 };
  }
}

export function writeSoundLabSession(session: SoundLabSession): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(SOUND_LAB_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function persistSoundLabParams(
  params: Omit<SoundLabSession, "accumulatedPracticeSec">,
  accumulatedPracticeSec: number,
): void {
  writeSoundLabSession({
    ...params,
    accumulatedPracticeSec: Math.max(0, Math.floor(accumulatedPracticeSec)),
  });
}
