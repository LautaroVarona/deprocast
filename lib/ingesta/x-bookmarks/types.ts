import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";

export const X_BOOKMARK_STATUSES = [
  "pending",
  "calibrated",
  "enriched",
  "below_threshold",
] as const;

export type XBookmarkStatus = (typeof X_BOOKMARK_STATUSES)[number];

export const DEFAULT_CALIBRATION_THRESHOLD = 7;

export const EXISTENTIAL_PROJECTS = [
  "Deprocast",
  "Studianta",
  "Versa",
  "El Fotógrafo",
] as const;

export type ExistentialProject = (typeof EXISTENTIAL_PROJECTS)[number];

export type XBookmarkTweet = {
  externalId?: string;
  author: string;
  handle: string;
  text: string;
  mediaUrls: string[];
  tweetUrl?: string;
  bookmarkedAt?: string;
};

export type XBookmarkRecord = XBookmarkTweet & {
  id: string;
  weight: number | null;
  calibratedAt: string | null;
  titleEs: string | null;
  metaTags: string[] | null;
  linkedProjects: string[] | null;
  enrichedAt: string | null;
  importBatchId: string | null;
  status: XBookmarkStatus;
  createdAt: string;
  updatedAt: string;
};

export type XBookmarkImportResult = {
  importBatchId: string;
  imported: number;
  skipped: number;
};

export type XBookmarkEnrichment = {
  titleEs: string;
  metaTags: string[];
  linkedProjects: string[];
};

export type XBookmarkProcessResult = {
  processed: number;
  enriched: XBookmarkRecord[];
  kgIngested: number;
};

export const KEY_WEIGHT_MAP: Record<string, number> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  q: 10,
  w: 11,
  e: 12,
};

export function isValidCalibrationWeight(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_BASE_WEIGHT &&
    value <= MAX_BASE_WEIGHT
  );
}

export function weightFromKeyboardKey(key: string): number | null {
  const normalized = key.toLowerCase();
  const weight = KEY_WEIGHT_MAP[normalized];
  return weight ?? null;
}
