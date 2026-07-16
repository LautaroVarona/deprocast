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
};

export type TemporalRangeResponse = {
  from: string;
  to: string;
  universe: string | null;
  tasks: TemporalBlock[];
  events: TemporalBlock[];
  blocks: TemporalBlock[];
};
