export type IsochronicParams = {
  pulseHz: number;
  volume: number;
};

export type IsochronicSession = {
  pulseHz: number;
  volume: number;
  accumulatedPracticeSec: number;
};

export type PulseVisualState = {
  phase: number;
  intensity: number;
};
