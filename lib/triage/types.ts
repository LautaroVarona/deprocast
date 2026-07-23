export type EntityCandidateType = "PERSON" | "PROJECT";

export type EntityCandidateStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "MERGED";

export type EntityCandidateDto = {
  id: string;
  name: string;
  type: EntityCandidateType;
  contextSnippet: string;
  sourceId: string | null;
  status: EntityCandidateStatus;
  resolvedNodeId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TriageMergeTarget = {
  id: string;
  label: string;
  kind: "persona" | "proyecto";
  sublabel: string | null;
};
