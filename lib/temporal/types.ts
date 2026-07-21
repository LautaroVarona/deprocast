import type { GeoPayload } from "@/lib/geo/types";
import type {
  BlockKind,
  EcosystemArea,
  ExecutionStatus,
} from "@/lib/calendario/constants";

export type TemporalBlockKind = "task" | "event";

export type TemporalBlock = {
  kind: TemporalBlockKind;
  id: string;
  title: string;
  start: string;
  end: string | null;
  status: string;
  projectId: string | null;
  weight: number | null;
  source: string;
  pillar?: string;
  structuredData?: Record<string, unknown>;
  location?: GeoPayload | null;
  blockKind?: BlockKind;
  actionCost?: number | null;
  executionStatus?: ExecutionStatus;
  ecosystemArea?: EcosystemArea | null;
  durationMin?: number | null;
};

export type TemporalRangeResponse = {
  from: string;
  to: string;
  universe: string | null;
  tasks: TemporalBlock[];
  events: TemporalBlock[];
  blocks: TemporalBlock[];
};
