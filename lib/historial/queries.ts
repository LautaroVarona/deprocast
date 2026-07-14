import type { ActivityLog } from "@prisma/client";

import { filterActivityEntriesForUniverse } from "@/lib/babel/universe-refs";
import type {
  ActivityDayGroup,
  ActivityEntry,
  ActivityListFilters,
  ActivityListResult,
} from "@/lib/historial/types";
import { prisma } from "@/lib/prisma";

function toActivityEntry(row: ActivityLog): ActivityEntry {
  return {
    id: row.id,
    occurredAt: row.occurredAt.toISOString(),
    category: row.category as ActivityEntry["category"],
    action: row.action,
    title: row.title,
    summary: row.summary,
    agentId: row.agentId,
    agentName: row.agentName,
    modelUsed: row.modelUsed,
    sourceType: row.sourceType,
    sourceRef: row.sourceRef,
    correlationId: row.correlationId,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: row.createdAt.toISOString(),
  };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseDayKey(dayKey: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) return null;
  const [, year, month, day] = match;
  const start = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(start.getTime())) return null;
  return { start: startOfDay(start), end: endOfDay(start) };
}

function formatDayLabel(date: Date): string {
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = startOfDay(date);

  if (target.getTime() === today.getTime()) return "Hoy";
  if (target.getTime() === yesterday.getTime()) return "Ayer";

  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function listActivityLogs(
  filters: ActivityListFilters = {},
): Promise<ActivityListResult> {
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500);

  const where: {
    category?: string;
    agentId?: string;
    occurredAt?: { gte?: Date; lte?: Date; lt?: Date };
  } = {};

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.agentId) {
    where.agentId = filters.agentId;
  }

  if (filters.day) {
    const range = parseDayKey(filters.day);
    if (range) {
      where.occurredAt = { gte: range.start, lte: range.end };
    }
  }

  if (filters.cursor) {
    const cursorDate = new Date(filters.cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      where.occurredAt = {
        ...where.occurredAt,
        lt: cursorDate,
      };
    }
  }

  const [rows, totalForDay] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: limit + 1,
    }),
    filters.day
      ? prisma.activityLog.count({
          where: {
            ...where,
            occurredAt: parseDayKey(filters.day)
              ? {
                  gte: parseDayKey(filters.day)!.start,
                  lte: parseDayKey(filters.day)!.end,
                }
              : undefined,
          },
        })
      : Promise.resolve(null),
  ]);

  const hasMore = rows.length > limit;
  const rawEntries = rows.slice(0, limit).map(toActivityEntry);
  const entries = await filterActivityEntriesForUniverse(
    rawEntries,
    filters.universeSlug,
  );
  const nextCursor =
    hasMore && rawEntries.length > 0
      ? rawEntries[rawEntries.length - 1]!.occurredAt
      : null;

  return {
    entries,
    nextCursor,
    totalForDay: filters.universeSlug ? entries.length : totalForDay,
  };
}

export async function listActivityByDays(
  filters: Omit<ActivityListFilters, "cursor"> & { days?: number } = {},
): Promise<ActivityDayGroup[]> {
  const days = filters.days ?? 7;
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 1000);

  const where: {
    category?: string;
    agentId?: string;
    occurredAt?: { gte: Date };
  } = {};

  if (filters.category) where.category = filters.category;
  if (filters.agentId) where.agentId = filters.agentId;

  if (filters.day) {
    const range = parseDayKey(filters.day);
    if (range) {
      const rows = await prisma.activityLog.findMany({
        where: {
          ...where,
          occurredAt: { gte: range.start, lte: range.end },
        },
        orderBy: { occurredAt: "desc" },
        take: limit,
      });

      const entries = await filterActivityEntriesForUniverse(
        rows.map(toActivityEntry),
        filters.universeSlug,
      );

      return [
        {
          dayKey: filters.day,
          dayLabel: formatDayLabel(range.start),
          entries,
        },
      ];
    }
  }

  const since = startOfDay(new Date());
  since.setDate(since.getDate() - (days - 1));
  where.occurredAt = { gte: since };

  const rows = await prisma.activityLog.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: limit,
  });

  const groups = new Map<string, ActivityEntry[]>();

  const filteredRows = await filterActivityEntriesForUniverse(
    rows.map(toActivityEntry),
    filters.universeSlug,
  );

  for (const entry of filteredRows) {
    const key = toDayKey(new Date(entry.occurredAt));
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayKey, entries]) => {
      const range = parseDayKey(dayKey);
      return {
        dayKey,
        dayLabel: range ? formatDayLabel(range.start) : dayKey,
        entries,
      };
    });
}

export async function getLastActivityForAgent(
  agentId: string,
  withinHours = 24,
): Promise<ActivityEntry | null> {
  const since = new Date();
  since.setHours(since.getHours() - withinHours);

  const row = await prisma.activityLog.findFirst({
    where: {
      agentId,
      occurredAt: { gte: since },
    },
    orderBy: { occurredAt: "desc" },
  });

  return row ? toActivityEntry(row) : null;
}

export async function getActiveAgentIds(withinHours = 24): Promise<string[]> {
  const since = new Date();
  since.setHours(since.getHours() - withinHours);

  const rows = await prisma.activityLog.findMany({
    where: {
      agentId: { not: null },
      occurredAt: { gte: since },
    },
    select: { agentId: true },
    distinct: ["agentId"],
  });

  return rows
    .map((r) => r.agentId)
    .filter((id): id is string => Boolean(id));
}

export async function getAllActivityForExport(
  filters: Omit<ActivityListFilters, "cursor" | "limit"> & { days?: number } = {},
): Promise<ActivityEntry[]> {
  const days = filters.days ?? 30;
  const where: {
    category?: string;
    agentId?: string;
    occurredAt?: { gte: Date; lte?: Date };
  } = {};

  if (filters.category) where.category = filters.category;
  if (filters.agentId) where.agentId = filters.agentId;

  if (filters.day) {
    const range = parseDayKey(filters.day);
    if (range) {
      where.occurredAt = { gte: range.start, lte: range.end };
    }
  } else {
    const since = startOfDay(new Date());
    since.setDate(since.getDate() - (days - 1));
    where.occurredAt = { gte: since };
  }

  const rows = await prisma.activityLog.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: 5000,
  });

  return rows.map(toActivityEntry);
}

export { toDayKey, formatDayLabel, parseDayKey };
