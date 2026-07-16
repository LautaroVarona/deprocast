import "server-only";

import { getCortexSnapshot } from "@/lib/cortex/queries";
import {
  SOURCE_TYPE_ACCENTS,
} from "@/lib/castillo/constants";
import type {
  CastleCatalogItem,
  CastleCatalogSnapshot,
  CastleSourceType,
} from "@/lib/castillo/types";
import { searchNodes } from "@/lib/kg/queries";
import { prisma } from "@/lib/prisma";
import { listProjects } from "@/lib/projects/service";

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function resolveDeepLink(
  sourceType: CastleSourceType,
  sourceId: string,
  meta?: Record<string, string | null>,
): string {
  switch (sourceType) {
    case "cortex_document":
      return meta?.campoSlug
        ? `/proyectos?highlight=${sourceId}`
        : "/proyectos";
    case "kg_node":
      return `/grafo?node=${sourceId}`;
    case "cuaderno_page":
      return meta?.notebookId
        ? `/ingesta/cuadernos/${meta.notebookId}`
        : "/ingesta/cuadernos";
    case "context_event":
      return "/diario";
    case "encyclopedia_entry":
      return "/enciclopedia";
    case "x_bookmark":
      return "/ingesta";
    case "project":
      return `/proyectos?highlight=${sourceId}`;
    case "vision_image":
      return "/ludus/castillo";
    default:
      return "/ludus/castillo";
  }
}

export async function buildCastleCatalog(
  gridId: string,
): Promise<CastleCatalogSnapshot> {
  const [
    cortex,
    kgNodes,
    pages,
    events,
    entries,
    bookmarks,
    projects,
    placedCards,
  ] =
    await Promise.all([
      getCortexSnapshot(),
      searchNodes({ limit: 120 }),
      prisma.notebookPage.findMany({
        where: { status: "COMPLETED" },
        orderBy: { updatedAt: "desc" },
        take: 80,
        include: { notebook: { select: { id: true, title: true } } },
      }),
      prisma.contextEvent.findMany({
        orderBy: { occurredAt: "desc" },
        take: 60,
      }),
      prisma.encyclopediaEntry.findMany({
        orderBy: { updatedAt: "desc" },
        take: 60,
      }),
      prisma.xBookmark.findMany({
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
      listProjects(),
      prisma.castleCard.findMany({
        where: { gridId },
        select: { sourceType: true, sourceId: true },
      }),
    ]);

  const placedKeys = new Set(
    placedCards
      .filter((card) => card.sourceId)
      .map((card) => `${card.sourceType}:${card.sourceId}`),
  );

  const isPlaced = (sourceType: CastleSourceType, sourceId: string) =>
    placedKeys.has(`${sourceType}:${sourceId}`);

  const items: CastleCatalogItem[] = [];

  for (const node of cortex.nodes) {
    items.push({
      sourceType: "cortex_document",
      sourceId: node.id,
      title: node.titulo,
      subtitle: [node.materia, node.campo].filter(Boolean).join(" · ") || null,
      accentHint: SOURCE_TYPE_ACCENTS.cortex_document,
      deepLink: resolveDeepLink("cortex_document", node.id, {
        campoSlug: node.campoSlug,
      }),
      meta: {
        formato: node.formato,
        campo: node.campo,
        particula: node.particula,
      },
      placed: isPlaced("cortex_document", node.id),
    });
  }

  for (const node of kgNodes) {
    items.push({
      sourceType: "kg_node",
      sourceId: node.id,
      title: node.primaryName,
      subtitle: node.type,
      accentHint: SOURCE_TYPE_ACCENTS.kg_node,
      deepLink: resolveDeepLink("kg_node", node.id),
      meta: { type: node.type },
      placed: isPlaced("kg_node", node.id),
    });
  }

  for (const page of pages) {
    const preview =
      page.semanticVector?.trim() ||
      `Página ${page.pageNumber}`;
    items.push({
      sourceType: "cuaderno_page",
      sourceId: page.id,
      title: `${page.notebook.title} · p.${page.pageNumber}`,
      subtitle: truncate(preview, 80),
      accentHint: SOURCE_TYPE_ACCENTS.cuaderno_page,
      deepLink: resolveDeepLink("cuaderno_page", page.id, {
        notebookId: page.notebook.id,
      }),
      meta: {
        notebookId: page.notebook.id,
        pageNumber: page.pageNumber,
      },
      placed: isPlaced("cuaderno_page", page.id),
    });
  }

  for (const event of events) {
    items.push({
      sourceType: "context_event",
      sourceId: event.id,
      title: truncate(event.content, 60),
      subtitle: `${event.pillar} · ${event.source}`,
      accentHint: SOURCE_TYPE_ACCENTS.context_event,
      deepLink: resolveDeepLink("context_event", event.id),
      meta: {
        pillar: event.pillar,
        status: event.status,
      },
      placed: isPlaced("context_event", event.id),
    });
  }

  for (const entry of entries) {
    items.push({
      sourceType: "encyclopedia_entry",
      sourceId: entry.id,
      title: entry.title,
      subtitle: truncate(entry.body, 80),
      accentHint: SOURCE_TYPE_ACCENTS.encyclopedia_entry,
      deepLink: resolveDeepLink("encyclopedia_entry", entry.id),
      meta: { slug: entry.slug },
      placed: isPlaced("encyclopedia_entry", entry.id),
    });
  }

  for (const bookmark of bookmarks) {
    items.push({
      sourceType: "x_bookmark",
      sourceId: bookmark.id,
      title: bookmark.titleEs?.trim() || truncate(bookmark.text, 50),
      subtitle: `@${bookmark.handle}`,
      accentHint: SOURCE_TYPE_ACCENTS.x_bookmark,
      deepLink: resolveDeepLink("x_bookmark", bookmark.id),
      meta: {
        weight: bookmark.weight,
      },
      placed: isPlaced("x_bookmark", bookmark.id),
    });
  }

  const projectItems: CastleCatalogItem[] = projects.slice(0, 80).map((project) => {
    const key = `project:${project.id}`;
    return {
      sourceType: "project",
      sourceId: project.id,
      title: project.title,
      subtitle: project.description || null,
      accentHint: SOURCE_TYPE_ACCENTS.project,
      deepLink: `/proyectos?highlight=${project.id}`,
      meta: {
        campoSlug: project.campoSlug,
        status: project.estado,
      },
      placed: isPlaced("project", project.id),
    };
  });

  const allItems = [...items, ...projectItems];
  const placedCount = allItems.filter((item) => item.placed).length;

  return {
    items: allItems.sort(
      (a, b) =>
        Number(a.placed) - Number(b.placed) ||
        a.title.localeCompare(b.title, "es"),
    ),
    totalCount: allItems.length,
    placedCount,
  };
}
