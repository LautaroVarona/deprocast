export type SoundLabMode = "isochronic" | "binaural" | "meditative";

export type PulseVisualState = {
  phase: number;
  intensity: number;
};

export type BreathingPhase = "inhale" | "hold-in" | "exhale" | "hold-out";

export type BreathingState = {
  phase: BreathingPhase;
  phaseProgress: number;
  cycleProgress: number;
  scale: number;
  secondsLeft: number;
};

export type SoundLabParams = {
  mode: SoundLabMode;
  volumeDb: number;
  pulseHz: number;
  isochronicCarrierHz: number;
  carrierHz: number;
  beatHz: number;
  meditativeBaseHz: number;
  breathingSecPerPhase: number;
};

export type SoundLabSession = SoundLabParams & {
  accumulatedPracticeSec: number;
};

export const BREATHING_PHASE_LABELS: Record<BreathingPhase, string> = {
  inhale: "Inhalar",
  "hold-in": "Retener",
  exhale: "Exhalar",
  "hold-out": "Pausa",
};
