export type AudioAssetSummary = {
  id: string;
  filename: string;
  fileUrl: string;
  durationMs: number | null;
  originalCreatedAt: string;
  status: string;
  createdAt: string;
  transcript: { id: string; preview?: string } | null;
};

export type DuplicateReason =
  | "normalized_name"
  | "copy_suffix"
  | "number_collision";

export type DuplicateMember = {
  id: string;
  filename: string;
  status: string;
  originalCreatedAt: string;
  hasTranscript: boolean;
  isCopySuffix: boolean;
  copyIndex: number | null;
};

export type DuplicateGroup = {
  id: string;
  reason: DuplicateReason;
  normalizedKey: string;
  keepId: string;
  members: DuplicateMember[];
  duplicateIds: string[];
};

export type DeduplicateScanResult = {
  scannedAt: string;
  totalAssets: number;
  groups: DuplicateGroup[];
  duplicateCount: number;
  uniqueCount: number;
};

export type PreprocessToolId =
  | "deduplicate"
  | "voice-isolation"
  | "silence-trim"
  | "level-normalize";

export type PreprocessToolStatus = "available" | "planned" | "beta";

export type PreprocessTool = {
  id: PreprocessToolId;
  label: string;
  description: string;
  status: PreprocessToolStatus;
  focus: "pre" | "stt";
};

export type PostprocessStageId =
  | "stt"
  | "purifier"
  | "segmentation"
  | "classification"
  | "organization"
  | "graph";

export type PostprocessStage = {
  id: PostprocessStageId;
  label: string;
  description: string;
  route?: string;
  agentId?: string;
};

export type AudioStationPhase =
  | "idle"
  | "scanning"
  | "dedup-ready"
  | "dedup-applied"
  | "processing"
  | "error";
