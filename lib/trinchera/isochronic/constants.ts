import type { IsochronicParams } from "@/lib/trinchera/isochronic/types";

export const ISOCHRONIC_STORAGE_KEY = "deprocast:trinchera:isochronic";

export const CARRIER_HZ = 220;

export const PULSE_MIN = 1;
export const PULSE_MAX = 40;
export const VOLUME_MIN = 0.01;
export const VOLUME_MAX = 0.35;

export const DEFAULT_ISOCHRONIC_PARAMS: IsochronicParams = {
  pulseHz: 10,
  volume: 0.12,
};
