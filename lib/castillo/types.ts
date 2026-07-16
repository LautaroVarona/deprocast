export const CASTLE_SOURCE_TYPES = [
  "cortex_document",
  "kg_node",
  "cuaderno_page",
  "context_event",
  "encyclopedia_entry",
  "x_bookmark",
  "project",
  "vision_image",
  "freeform",
] as const;

export type CastleSourceType = (typeof CASTLE_SOURCE_TYPES)[number];

export type CastleCardLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CastleCardDto = {
  id: string;
  gridId: string;
  sourceType: CastleSourceType;
  sourceId: string | null;
  title: string;
  subtitle: string | null;
  accent: string | null;
  tags: string[];
  layout: CastleCardLayout;
  deepLink: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CastleGridDto = {
  id: string;
  name: string;
  isDefault: boolean;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CastleSnapshot = {
  grids: CastleGridDto[];
  activeGridId: string;
  cards: CastleCardDto[];
};

export type CatalogItemMeta = Record<string, string | number | boolean | null>;

export type CastleCatalogItem = {
  sourceType: CastleSourceType;
  sourceId: string;
  title: string;
  subtitle: string | null;
  accentHint: string;
  deepLink: string;
  meta: CatalogItemMeta;
  placed: boolean;
};

export type CastleCatalogSnapshot = {
  items: CastleCatalogItem[];
  totalCount: number;
  placedCount: number;
};

export type CastlePlacementSummary = {
  sourceType: CastleSourceType;
  sourceId: string;
  tagCount: number;
};
