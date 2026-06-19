import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";
import type { CalibratorCardSource, CalibratorQueueConfig } from "./types";

export { MAX_BASE_WEIGHT, MIN_BASE_WEIGHT };

export const DEFAULT_QUEUE_LIMIT = 20;
export const DEFAULT_CALIBRATION_WEIGHT = 6;
export const MIN_QUEUE_LIMIT = 1;
export const MAX_QUEUE_LIMIT = 100;

export const CALIBRATOR_CARD_SOURCES: CalibratorCardSource[] = [
  "validated",
  "generated",
];

export const DEFAULT_QUEUE_CONFIG: CalibratorQueueConfig = {
  sources: ["validated"],
  limit: DEFAULT_QUEUE_LIMIT,
};
