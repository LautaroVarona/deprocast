export type CalibratorCardSource = "validated" | "generated";

export type VibeCalibrationCard = {
  id: string;
  title: string;
  description: string;
  source: CalibratorCardSource;
  sourceRef?: string;
  metadata: Record<string, unknown>;
};

export type VibeCalibrationVotePayload = {
  cardId: string;
  weight: number;
  timestamp: Date;
  metadata: Record<string, unknown>;
  title?: string;
};

export type CalibratorQueueConfig = {
  sources: CalibratorCardSource[];
  campoSlug?: string;
  limit: number;
  universeSlug?: string;
};

export type CalibratorSessionStatus = "idle" | "active" | "completed";

export type CardSourceAdapter = {
  source: CalibratorCardSource;
  fetchCards: (config: CalibratorQueueConfig) => Promise<VibeCalibrationCard[]>;
};
