import type { DayOffset } from "@/lib/pendientes/types";

export type UniverseDto = {
  id: string;
  slug: string;
  label: string;
  description: string;
  trenchesWeight: number | null;
  isRoot: boolean;
  discoveredAt: string;
  updatedAt: string;
};

export type BabelRecordDto = {
  id: string;
  kind: string;
  physicalRef: string;
  contentPreview: string;
  occurredAt: string;
  contextSeal: string;
  campoSlug: string | null;
  channel: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type RegisterBabelRecordInput = {
  kind: string;
  physicalRef: string;
  contentPreview?: string;
  occurredAt?: Date;
  contextSeal: string;
  campoSlug?: string | null;
  channel?: string | null;
  metadata?: Record<string, unknown>;
};

export type ListBabelRecordsInput = {
  universeSlug?: string;
  day?: DayOffset;
  limit?: number;
};

export type CreateUniverseInput = {
  label: string;
  description?: string;
};
