import "server-only";

import { ingestDocumentSource, type SourceIngestSummary } from "@/lib/kg/sources/common";
import type { LlmEntity, LlmKgExtraction, LlmRelation } from "@/lib/kg/types";
import type { XBookmarkRecord } from "@/lib/ingesta/x-bookmarks/types";

function buildStructuredExtraction(bookmark: XBookmarkRecord): LlmKgExtraction {
  const entities: LlmEntity[] = [];
  const relations: LlmRelation[] = [];

  const bookmarkName = `bookmark:${bookmark.id}`;
  entities.push({
    name: bookmarkName,
    type: "documento",
    aliases: [bookmark.titleEs ?? bookmark.text.slice(0, 80)],
    metadata: {
      bookmarkId: bookmark.id,
      handle: bookmark.handle,
      url: bookmark.tweetUrl ?? null,
      weight: bookmark.weight ?? null,
      status: bookmark.status,
    },
    confidence: 0.95,
  });

  entities.push({
    name: bookmark.author,
    type: "persona",
    personaKind: "fisica",
    metadata: {
      handle: bookmark.handle,
      rol: "autor_x",
    },
    confidence: 0.85,
  });

  relations.push({
    fromName: bookmarkName,
    toName: bookmark.author,
    relationType: "menciona_a",
    context: `El bookmark ${bookmark.id} pertenece a una publicación de ${bookmark.author}.`,
    weight: 5,
    confidence: 0.85,
  });

  for (const tag of bookmark.metaTags ?? []) {
    const tagName = tag.trim();
    if (!tagName) continue;
    entities.push({
      name: tagName,
      type: "concepto",
      metadata: { origin: "x_bookmark_tag" },
      confidence: 0.8,
    });
    relations.push({
      fromName: bookmarkName,
      toName: tagName,
      relationType: "menciona_a",
      context: `El bookmark ${bookmark.id} contiene la etiqueta ${tagName}.`,
      weight: 4,
      confidence: 0.8,
    });
  }

  for (const linkedProject of bookmark.linkedProjects ?? []) {
    const projectName = linkedProject.trim();
    if (!projectName) continue;
    entities.push({
      name: projectName,
      type: "proyecto",
      metadata: { origin: "x_bookmark_link" },
      confidence: 0.82,
    });
    relations.push({
      fromName: bookmarkName,
      toName: projectName,
      relationType: "relacionado_con",
      context: `El bookmark ${bookmark.id} se vinculó automáticamente con ${projectName}.`,
      weight: 6,
      confidence: 0.85,
    });
  }

  return { entities, relations };
}

function buildBookmarkBody(bookmark: XBookmarkRecord): string {
  return [
    `Autor: ${bookmark.author} (${bookmark.handle})`,
    bookmark.tweetUrl ? `URL: ${bookmark.tweetUrl}` : "",
    bookmark.titleEs ? `Título ES: ${bookmark.titleEs}` : "",
    `Texto: ${bookmark.text}`,
    bookmark.metaTags?.length ? `Tags: ${bookmark.metaTags.join(", ")}` : "",
    bookmark.linkedProjects?.length
      ? `Proyectos vinculados: ${bookmark.linkedProjects.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function ingestXBookmark(
  bookmark: XBookmarkRecord,
  options: { model?: string; force?: boolean } = {},
): Promise<SourceIngestSummary> {
  const sourceId = bookmark.id;
  const documentPath = `x-bookmarks/${bookmark.id}`;
  const title = bookmark.titleEs ?? `Bookmark de ${bookmark.handle}`;
  const structured = buildStructuredExtraction(bookmark);
  const body = buildBookmarkBody(bookmark);

  const outcome = await ingestDocumentSource({
    sourceType: "bookmark",
    sourceId,
    documentPath,
    title,
    documentMeta: {
      bookmarkId: bookmark.id,
      handle: bookmark.handle,
      weight: bookmark.weight,
      status: bookmark.status,
    },
    body,
    structured,
    sourceMetadata: {
      bookmarkId: bookmark.id,
      handle: bookmark.handle,
      weight: bookmark.weight,
    },
    model: options.model,
    force: options.force,
  });

  return {
    sourceId,
    title,
    skipped: outcome.skipped,
    nodes: outcome.result?.nodeIds.length ?? 0,
    edges: outcome.result?.edgeIds.length ?? 0,
    mentions: outcome.result?.mentionIds.length ?? 0,
  };
}
