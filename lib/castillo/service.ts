import "server-only";

import {
  DEFAULT_CARD_LAYOUT,
  DEFAULT_GRID_NAME,
  SOURCE_TYPE_ACCENTS,
} from "@/lib/castillo/constants";
import type {
  CastleCardDto,
  CastleCardLayout,
  CastleGridDto,
  CastlePlacementSummary,
  CastleSnapshot,
  CastleSourceType,
} from "@/lib/castillo/types";
import { createProposedEvents } from "@/lib/events/service";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((tag): tag is string => typeof tag === "string");
}

function parseLayout(value: unknown): CastleCardLayout {
  if (
    value &&
    typeof value === "object" &&
    "x" in value &&
    "y" in value &&
    "w" in value &&
    "h" in value
  ) {
    const layout = value as CastleCardLayout;
    return {
      x: Number(layout.x) || 0,
      y: Number(layout.y) || 0,
      w: Number(layout.w) || DEFAULT_CARD_LAYOUT.w,
      h: Number(layout.h) || DEFAULT_CARD_LAYOUT.h,
    };
  }
  return { x: 0, y: 0, w: DEFAULT_CARD_LAYOUT.w, h: DEFAULT_CARD_LAYOUT.h };
}

function resolveDeepLink(
  sourceType: CastleSourceType,
  sourceId: string | null,
): string | null {
  if (!sourceId) return null;
  switch (sourceType) {
    case "cortex_document":
      return `/proyectos?highlight=${sourceId}`;
    case "kg_node":
      return `/grafo?node=${sourceId}`;
    case "cuaderno_page":
      return "/ingesta/cuadernos";
    case "context_event":
      return "/diario";
    case "encyclopedia_entry":
      return "/enciclopedia";
    case "x_bookmark":
      return "/ingesta";
    default:
      return null;
  }
}

function mapGrid(
  grid: { id: string; name: string; isDefault: boolean; createdAt: Date; updatedAt: Date },
  cardCount: number,
): CastleGridDto {
  return {
    id: grid.id,
    name: grid.name,
    isDefault: grid.isDefault,
    cardCount,
    createdAt: grid.createdAt.toISOString(),
    updatedAt: grid.updatedAt.toISOString(),
  };
}

function mapCard(card: {
  id: string;
  gridId: string;
  sourceType: string;
  sourceId: string | null;
  title: string;
  subtitle: string | null;
  accent: string | null;
  tags: unknown;
  layout: unknown;
  createdAt: Date;
  updatedAt: Date;
}): CastleCardDto {
  return {
    id: card.id,
    gridId: card.gridId,
    sourceType: card.sourceType as CastleSourceType,
    sourceId: card.sourceId,
    title: card.title,
    subtitle: card.subtitle,
    accent: card.accent,
    tags: parseTags(card.tags),
    layout: parseLayout(card.layout),
    deepLink: resolveDeepLink(
      card.sourceType as CastleSourceType,
      card.sourceId,
    ),
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

export async function ensureDefaultGrid(): Promise<CastleGridDto> {
  const existing = await prisma.castleGrid.findFirst({
    where: { isDefault: true },
    include: { _count: { select: { cards: true } } },
  });

  if (existing) {
    return mapGrid(existing, existing._count.cards);
  }

  const grid = await prisma.castleGrid.create({
    data: {
      name: DEFAULT_GRID_NAME,
      isDefault: true,
    },
    include: { _count: { select: { cards: true } } },
  });

  return mapGrid(grid, grid._count.cards);
}

export async function listGrids(): Promise<CastleGridDto[]> {
  await ensureDefaultGrid();
  const grids = await prisma.castleGrid.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { cards: true } } },
  });
  return grids.map((grid) => mapGrid(grid, grid._count.cards));
}

export async function createGrid(name: string): Promise<CastleGridDto> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("El nombre del grid es obligatorio.");
  }

  const grid = await prisma.castleGrid.create({
    data: { name: trimmed, isDefault: false },
    include: { _count: { select: { cards: true } } },
  });

  return mapGrid(grid, grid._count.cards);
}

export async function getCastleSnapshot(
  gridId?: string,
): Promise<CastleSnapshot> {
  const grids = await listGrids();
  const activeGrid =
    grids.find((grid) => grid.id === gridId) ??
    grids.find((grid) => grid.isDefault) ??
    (await ensureDefaultGrid());

  const cards = await prisma.castleCard.findMany({
    where: { gridId: activeGrid.id },
    orderBy: { createdAt: "asc" },
  });

  return {
    grids,
    activeGridId: activeGrid.id,
    cards: cards.map(mapCard),
  };
}

function nextLayoutPosition(
  existing: CastleCardLayout[],
): CastleCardLayout {
  if (existing.length === 0) {
    return { x: 0, y: 0, w: DEFAULT_CARD_LAYOUT.w, h: DEFAULT_CARD_LAYOUT.h };
  }

  const maxY = existing.reduce(
    (max, layout) => Math.max(max, layout.y + layout.h),
    0,
  );

  return {
    x: 0,
    y: maxY,
    w: DEFAULT_CARD_LAYOUT.w,
    h: DEFAULT_CARD_LAYOUT.h,
  };
}

export async function placeCatalogItem(input: {
  gridId: string;
  sourceType: CastleSourceType;
  sourceId: string;
  title: string;
  subtitle?: string | null;
  accent?: string | null;
}): Promise<CastleCardDto> {
  const existing = await prisma.castleCard.findFirst({
    where: {
      gridId: input.gridId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    },
  });

  if (existing) {
    return mapCard(existing);
  }

  const siblings = await prisma.castleCard.findMany({
    where: { gridId: input.gridId },
    select: { layout: true },
  });

  const layouts = siblings.map((card) => parseLayout(card.layout));
  const layout = nextLayoutPosition(layouts);

  const card = await prisma.castleCard.create({
    data: {
      gridId: input.gridId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      title: input.title,
      subtitle: input.subtitle ?? null,
      accent: input.accent ?? SOURCE_TYPE_ACCENTS[input.sourceType],
      tags: [] as Prisma.InputJsonValue,
      layout: layout as Prisma.InputJsonValue,
    },
  });

  return mapCard(card);
}

export async function updateCastleCard(
  cardId: string,
  patch: {
    title?: string;
    subtitle?: string | null;
    accent?: string | null;
    tags?: string[];
    layout?: CastleCardLayout;
    emitClassificationEvent?: boolean;
  },
): Promise<CastleCardDto> {
  const current = await prisma.castleCard.findUnique({ where: { id: cardId } });
  if (!current) {
    throw new Error("Tarjeta no encontrada en el Castillo.");
  }

  const tagsChanged =
    patch.tags !== undefined &&
    JSON.stringify(parseTags(current.tags)) !== JSON.stringify(patch.tags);

  const card = await prisma.castleCard.update({
    where: { id: cardId },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.subtitle !== undefined ? { subtitle: patch.subtitle } : {}),
      ...(patch.accent !== undefined ? { accent: patch.accent } : {}),
      ...(patch.tags !== undefined
        ? { tags: patch.tags as Prisma.InputJsonValue }
        : {}),
      ...(patch.layout !== undefined
        ? { layout: patch.layout as Prisma.InputJsonValue }
        : {}),
    },
  });

  if (
    (patch.emitClassificationEvent || tagsChanged) &&
    patch.tags &&
    current.sourceId
  ) {
    const links =
      current.sourceType === "cortex_document"
        ? [
            {
              entityType: "proyecto" as const,
              entityId: current.sourceId,
              entityLabel: current.title,
              linkRole: "related" as const,
            },
          ]
        : [];

    await createProposedEvents({
      source: "manual",
      sourceRef: `castillo:${card.id}`,
      occurredAt: new Date(),
      events: [
        {
          content: `Clasificación en Castillo: ${current.title}`,
          pillar: "general",
          structuredData: {
            kind: "castillo_classification",
            sourceType: current.sourceType,
            sourceId: current.sourceId,
            tags: patch.tags,
            accent: patch.accent ?? current.accent,
            cardId: card.id,
          },
          links,
        },
      ],
    });
  }

  return mapCard(card);
}

export async function removeCastleCard(cardId: string): Promise<void> {
  await prisma.castleCard.delete({ where: { id: cardId } });
}

export async function getCastlePlacementsForDocuments(
  documentIds: string[],
): Promise<Map<string, CastlePlacementSummary>> {
  if (documentIds.length === 0) return new Map();

  const cards = await prisma.castleCard.findMany({
    where: {
      sourceType: "cortex_document",
      sourceId: { in: documentIds },
    },
    select: { sourceType: true, sourceId: true, tags: true },
  });

  const map = new Map<string, CastlePlacementSummary>();
  for (const card of cards) {
    if (!card.sourceId) continue;
    map.set(card.sourceId, {
      sourceType: "cortex_document",
      sourceId: card.sourceId,
      tagCount: parseTags(card.tags).length,
    });
  }
  return map;
}

export async function getLudusWorldStats(): Promise<{
  catalogTotal: number;
  placedOnCanvas: number;
}> {
  const defaultGrid = await ensureDefaultGrid();
  const { buildCastleCatalog } = await import("@/lib/castillo/catalog");
  const catalog = await buildCastleCatalog(defaultGrid.id);
  return {
    catalogTotal: catalog.totalCount,
    placedOnCanvas: catalog.placedCount,
  };
}
