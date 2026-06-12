/**
 * Campos soberanos: contenedores de proyectos creados por el usuario.
 * "Babel" es el sumidero universal de materia prima sin clasificar; el resto se crea al vuelo.
 */

export const DEFAULT_CAMPO_SLUG = "babel";
export const BABEL_CAMPO_LABEL = "Babel";
export const MATERIA_PRIMA_ESTADO = "Materia Prima";

const KNOWN_CAMPO_LABELS: Record<string, string> = {
  [DEFAULT_CAMPO_SLUG]: BABEL_CAMPO_LABEL,
};

const CAMPO_SLUG_RE = /^[a-z][a-z0-9_-]*$/;

export type CampoSlug = string;

export type CampoInfo = {
  slug: CampoSlug;
  label: string;
  count: number;
};

export function isCampoSlug(value: unknown): value is CampoSlug {
  return typeof value === "string" && CAMPO_SLUG_RE.test(value);
}

export function getCampoLabel(slug: string): string {
  return KNOWN_CAMPO_LABELS[slug] ?? humanizeSlug(slug);
}

export function getCampoSlugFromLabel(label: string): CampoSlug | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  for (const [slug, knownLabel] of Object.entries(KNOWN_CAMPO_LABELS)) {
    if (knownLabel === trimmed) return slug;
  }

  const slugified = slugifyCampoInput(trimmed);
  return isCampoSlug(slugified) ? slugified : null;
}

export function slugifyCampoInput(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getDefaultCampo(): CampoInfo {
  return {
    slug: DEFAULT_CAMPO_SLUG,
    label: getCampoLabel(DEFAULT_CAMPO_SLUG),
    count: 0,
  };
}

/** Resuelve un slug de campo; sin valor explícito, cae en Babel. */
export function resolveCampoSlug(slug?: string | null): CampoSlug {
  return slug && isCampoSlug(slug) ? slug : DEFAULT_CAMPO_SLUG;
}
