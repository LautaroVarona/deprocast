export type BinauralParams = {
  carrierHz: number;
  beatHz: number;
};

export type BinauralPreset = {
  id: string;
  emoji: string;
  label: string;
  subtitle: string;
  carrierHz: number;
  beatHz: number;
};

export type WaveBand = "delta" | "theta" | "alpha" | "beta" | "gamma";

export const DEFAULT_VOLUME = 0.1;
export const DEFAULT_PARAMS: BinauralParams = {
  carrierHz: 180,
  beatHz: 10,
};

export const CARRIER_MIN = 100;
export const CARRIER_MAX = 500;
export const BEAT_MIN = 1;
export const BEAT_MAX = 50;
export const VOLUME_MIN = 0.01;
export const VOLUME_MAX = 0.3;
