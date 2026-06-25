export const NOTEBOOK_PAGE_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "ERROR",
] as const;

export type NotebookPageStatus = (typeof NOTEBOOK_PAGE_STATUSES)[number];

export type QuantaBBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Quanta = {
  id: string;
  text: string;
  bbox: QuantaBBox;
  confidence?: number;
};

export type StructuralVector = {
  tags: string[];
  projects: string[];
  hasDiagram: boolean;
  hasSymbols: boolean;
  hasArrows: boolean;
  hasRunes: boolean;
  hasGeometry: boolean;
  spatialMap?: {
    description: string;
    elements: Array<{
      label: string;
      role: string;
      connectsTo?: string[];
    }>;
  };
  visualRelations: Array<{
    from: string;
    to: string;
    relation: string;
  }>;
  rawNotes?: string;
};

export type NotebookSummary = {
  id: string;
  title: string;
  description: string | null;
  coverHue: number;
  pageCount: number;
  processedCount: number;
  coverPageId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotebookPageDto = {
  id: string;
  notebookId: string;
  pageNumber: number;
  filename: string;
  imageUrl: string;
  mimeType: string;
  status: NotebookPageStatus;
  semanticVector: string | null;
  structuralVector: StructuralVector | null;
  quanta: Quanta[] | null;
  processedAt: string | null;
  corpusCaptureId: string | null;
  createdAt: string;
};

export type NotebookDetail = NotebookSummary & {
  pages: NotebookPageDto[];
};

export type VisionAgentResult = {
  semanticVector: string;
  structuralVector: StructuralVector;
  quanta: Quanta[];
};
