import type { SoundLabParams } from "@/lib/trinchera/sound-lab/types";

export const SOUND_LAB_STORAGE_KEY = "deprocast:trinchera:sound-lab";

export const DB_MIN = -48;
export const DB_MAX = 0;
export const DB_STEP = 1;

export const PULSE_MIN = 1;
export const PULSE_MAX = 40;
export const ISO_CARRIER_MIN = 80;
export const ISO_CARRIER_MAX = 440;

export const CARRIER_MIN = 100;
export const CARRIER_MAX = 500;
export const BEAT_MIN = 1;
export const BEAT_MAX = 50;

export const MEDITATIVE_BASE_MIN = 30;
export const MEDITATIVE_BASE_MAX = 120;
export const BREATHING_SEC_MIN = 2;
export const BREATHING_SEC_MAX = 8;

export const DEFAULT_SOUND_LAB_PARAMS: SoundLabParams = {
  mode: "isochronic",
  volumeDb: -18,
  pulseHz: 10,
  isochronicCarrierHz: 220,
  carrierHz: 180,
  beatHz: 10,
  meditativeBaseHz: 55,
  breathingSecPerPhase: 4,
};
