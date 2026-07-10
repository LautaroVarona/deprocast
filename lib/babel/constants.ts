export const ROOT_UNIVERSE_SLUG = "babel" as const;
export const ROOT_UNIVERSE_LABEL = "Babel";

export const UNIVERSE_SLUG_RE = /^[a-z][a-z0-9_-]*$/;

export const UNIVERSE_HEADER = "x-deprocast-universe";

export const BABEL_RECORD_KINDS = [
  "capture",
  "audio",
  "journal",
  "vision",
  "tablas",
  "texto",
  "bookmark",
  "diario",
  "purifier",
] as const;

export type BabelRecordKind = (typeof BABEL_RECORD_KINDS)[number];

export const MIN_TRENCHES_WEIGHT = 1;
export const MAX_TRENCHES_WEIGHT = 12;
