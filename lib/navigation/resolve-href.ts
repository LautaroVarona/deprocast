import type { ArchivoKind } from "@/lib/archivo/types";
import { ARCHIVO_KIND_LABELS } from "@/lib/archivo/types";
import type { HybridSearchHit } from "@/lib/chat/hybrid-search";
import type { KgNodeSummary } from "@/lib/kg/types";
export function resolveArchivoHref(input: {
  kind: ArchivoKind;
  sourceId: string;
  meta?: Record<string, string | null>;
}): string {
  const meta = input.meta ?? {};

  switch (input.kind) {
    case "audio_transcript":
      return `/audio/${input.sourceId}`;
    case "journal":
      return "/diario";
    case "cuaderno_page":
      return meta.notebookId
        ? `/ingesta/cuadernos/${meta.notebookId}`
        : "/ingesta/cuadernos";
    case "project":
      return meta.campoSlug
        ? `/proyectos?highlight=${input.sourceId}`
        : "/proyectos";
    case "purifier_review":
      return `/validar?review=${input.sourceId}`;
    case "raw_document":
      return "/archivo";
    default:
      return "/archivo";
  }
}

export function resolveHybridHitHref(hit: HybridSearchHit): string {
  const source = hit.source;

  if (source.startsWith("journal/") || source.startsWith("journal\\")) {
    return "/diario";
  }

  if (source === "kg_edge") {
    return "/grafo";
  }

  const colon = source.indexOf(":");
  if (colon > 0) {
    const prefix = source.slice(0, colon);
    const id = source.slice(colon + 1);

    if (prefix === "audio_transcript" || prefix === "audio") {
      return `/audio/${id}`;
    }
    if (prefix === "journal") return "/diario";
    if (prefix === "project") return `/proyectos?highlight=${id}`;
    if (prefix === "purifier_doc" || prefix === "purifier_review") {
      return `/validar?review=${id}`;
    }
    if (prefix === "notebook_page" || prefix === "cuaderno_page") {
      return "/ingesta/cuadernos";
    }
    if (prefix === "kg_mention") return "/grafo";
  }

  if (hit.title.startsWith("Diario ·")) return "/diario";
  if (hit.title.startsWith("Mención ·") || hit.title.startsWith("Relación ")) {
    return "/grafo";
  }

  return "/archivo";
}

export function resolveKgNodeHref(node: KgNodeSummary): string {
  if (node.type === "persona") {
    const slug =
      typeof node.metadata.slug === "string" && node.metadata.slug
        ? node.metadata.slug
        : encodeURIComponent(node.primaryName.toLowerCase().replace(/\s+/g, "-"));
    return `/personas/${slug}`;
  }

  if (node.type === "proyecto") {
    return `/proyectos?highlight=${node.id}`;
  }

  return "/grafo";
}

export function badgeForArchivoKind(kind: ArchivoKind): string {
  return ARCHIVO_KIND_LABELS[kind];
}
