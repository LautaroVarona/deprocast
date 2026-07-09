export type MemorySourceType =
  | "journal"
  | "kg_mention"
  | "project"
  | "notebook_page"
  | "purifier_doc";

export type MemoryChunkInput = {
  sourceType: MemorySourceType;
  sourceId: string;
  chunkIndex: number;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export type MemorySearchHit = {
  id: string;
  sourceType: MemorySourceType;
  sourceId: string;
  title: string;
  body: string;
  score: number;
  createdAt?: string;
  source: string;
};
