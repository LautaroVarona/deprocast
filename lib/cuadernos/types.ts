export const NOTEBOOK_PAGE_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "ERROR",
] as const;

export type NotebookPageStatus = (typeof NOTEBOOK_PAGE_STATUSES)[number];

export const NOTEBOOK_KINDS = ["cuaderno", "libro"] as const;
export type NotebookKind = (typeof NOTEBOOK_KINDS)[number];

export const NOTEBOOK_METATAG_KINDS = [
  "autor",
  "tema",
  "proyecto",
  "custom",
] as const;
export type NotebookMetatagKind = (typeof NOTEBOOK_METATAG_KINDS)[number];

export type NotebookMetatag = {
  id: string;
  label: string;
  kind: NotebookMetatagKind;
  personaId?: string;
};

export const PAGE_METATAG_SOURCES = ["vision", "manual", "ai"] as const;
export type PageMetatagSource = (typeof PAGE_METATAG_SOURCES)[number];

export type PageMetatag = {
  id: string;
  label: string;
  source: PageMetatagSource;
  personaId?: string;
};

export const PAGE_ENRICHMENT_ACTIONS = [
  "diagrama",
  "esquema",
  "relacionar",
  "dibujos",
  "custom",
] as const;
export type PageEnrichmentAction = (typeof PAGE_ENRICHMENT_ACTIONS)[number];

export type PageEnrichment = {
  metatagId: string;
  action: PageEnrichmentAction;
  prompt?: string;
  result: string;
  createdAt: string;
};

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

export type PageNerEntities = {
  persona: string[];
  org: string[];
  proyecto: string[];
  lugar: string[];
  concepto: string[];
};

export type PageAnalysis = {
  suggestedTitle: string;
  explanation: string;
  writtenContentDescription: string;
  semanticTags: string[];
  ner: PageNerEntities;
  pageNumber: number;
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
  /** Análisis HITL editable (título, explicación, NER). */
  analysis?: PageAnalysis;
};

export type NotebookSummary = {
  id: string;
  title: string;
  description: string | null;
  kind: NotebookKind;
  authorPersonaId: string | null;
  authorName: string | null;
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
  pageAnalysis: PageAnalysis | null;
  pageMetatags: PageMetatag[];
  enrichments: PageEnrichment[];
  processedAt: string | null;
  corpusCaptureId: string | null;
  createdAt: string;
};

export type NotebookDetail = NotebookSummary & {
  metatags: NotebookMetatag[];
  pages: NotebookPageDto[];
};

export type VisionAgentResult = {
  semanticVector: string;
  structuralVector: StructuralVector;
  quanta: Quanta[];
  pageAnalysis: PageAnalysis;
};
