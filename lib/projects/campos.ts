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
  description?: string;
};

/** Campo con sus proyectos vinculados (vista detallada). */
export type Campo = CampoInfo & {
  description: string;
  createdAt: string;
  projectIds: string[];
};

export type CreateCampoInput = {
  label: string;
  description?: string;
  universeSlug?: string;
};

export type UpdateCampoInput = {
  label?: string;
  description?: string;
};

export type AssignProjectCampoInput = {
  projectId: string;
  campoSlug: CampoSlug;
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

/** Ordena slugs poniendo campos explícitos antes que Babel (sumidero por defecto). */
export function normalizeCampoSlugs(slugs: CampoSlug[]): CampoSlug[] {
  const unique = [...new Set(slugs.filter((slug) => isCampoSlug(slug)))];
  if (unique.length === 0) return [DEFAULT_CAMPO_SLUG];

  const nonBabel = unique.filter((slug) => slug !== DEFAULT_CAMPO_SLUG);
  const babel = unique.filter((slug) => slug === DEFAULT_CAMPO_SLUG);
  return [...nonBabel, ...babel];
}

/** Campo primario para persistir el proyecto: el primero no-Babel si existe. */
export function resolvePrimaryCampoSlug(slugs: CampoSlug[]): CampoSlug {
  const normalized = normalizeCampoSlugs(slugs);
  return normalized[0];
}

/** Slugs vinculados a un proyecto (primario + tags secundarios). */
export function extractLinkedCampoSlugs(project: {
  campoSlug: CampoSlug;
  metaTagsSecundarios: string[];
}): CampoSlug[] {
  const linked = new Set<CampoSlug>([resolveCampoSlug(project.campoSlug)]);

  for (const tag of project.metaTagsSecundarios) {
    if (tag.startsWith("campo_slug:")) {
      const slug = tag.slice("campo_slug:".length);
      if (isCampoSlug(slug)) linked.add(slug);
      continue;
    }
    if (tag.startsWith("campo:")) {
      const fromLabel = getCampoSlugFromLabel(tag.slice("campo:".length));
      if (fromLabel) linked.add(fromLabel);
    }
  }

  return [...linked];
}
