export type EncyclopediaReportType =
  | "validate"
  | "inaccuracy"
  | "missing"
  | "other";

export type EncyclopediaEntryDto = {
  id: string;
  slug: string;
  title: string;
  body: string;
  explorableTerms: string[];
  parentEntryId: string | null;
  triggerTerm: string | null;
  model: string | null;
  validatedCount: number;
  reportCount: number;
  kgNodeId: string | null;
  createdAt: string;
  updatedAt: string;
  fromCache: boolean;
};

export type SessionEdge = {
  id: string;
  fromEntryId: string;
  toEntryId: string;
  triggerTerm: string;
};

export type SessionGraphSnapshot = {
  nodes: {
    id: string;
    primaryName: string;
    type: string;
    degree: number;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    relationType: string;
    weight: number | null;
    confidence: number;
  }[];
};

export type ExploreInput = {
  concept: string;
  parentEntryId?: string;
  triggerTerm?: string;
  forceRegenerate?: boolean;
};

export type ExploreResult = {
  entry: EncyclopediaEntryDto;
  edge: SessionEdge | null;
};

export type ReportInput = {
  entryId: string;
  type: EncyclopediaReportType;
  comment?: string;
};

export type LinkCorpusInput = {
  entryId: string;
  targets: {
    nodeId: string;
    relationType: string;
    context?: string;
  }[];
};

export type GeneratedEntryContent = {
  title: string;
  body: string;
  explorableTerms: string[];
};
