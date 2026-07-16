import type { CastleSourceType } from "@/lib/castillo/types";

export const DEFAULT_GRID_NAME = "Principal";

export const CASTLE_GRID_COLS = 12;

export const DEFAULT_CARD_LAYOUT = {
  w: 3,
  h: 2,
  minW: 2,
  minH: 2,
};

export const SOURCE_TYPE_ACCENTS: Record<CastleSourceType, string> = {
  cortex_document: "orange",
  kg_node: "blue",
  cuaderno_page: "green",
  context_event: "cyan",
  encyclopedia_entry: "violet",
  x_bookmark: "amber",
  project: "emerald",
  vision_image: "violet",
  freeform: "zinc",
};

export const SOURCE_TYPE_LABELS: Record<CastleSourceType, string> = {
  cortex_document: "Documento",
  kg_node: "Entidad KG",
  cuaderno_page: "Cuaderno",
  context_event: "Evento",
  encyclopedia_entry: "Enciclopedia",
  x_bookmark: "Bookmark X",
  project: "Proyecto",
  vision_image: "Vision",
  freeform: "Nota libre",
};

export const ACCENT_CLASSES: Record<string, string> = {
  orange: "castillo-accent-orange",
  blue: "castillo-accent-blue",
  green: "castillo-accent-green",
  cyan: "castillo-accent-cyan",
  violet: "castillo-accent-violet",
  amber: "castillo-accent-amber",
  emerald: "castillo-accent-green",
  zinc: "castillo-accent-zinc",
};
