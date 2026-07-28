import "server-only";

import {
  clampHermeticGravity,
  type TriageCardDto,
} from "@/lib/cortex/triage-types";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 80;

function formatOriginLabel(channel: string, source?: string | null): string {
  const parts = [channel, source].filter(Boolean);
  return parts.join(" · ") || "desconocido";
}

/**
 * Cola HITL unificada: PendingTasks sugeridos, Quántomos no reconocidos
 * (vía espejo KgNode) y aristas KgEdge propuestas.
 */
export async function listTriageQueue(
  limit = DEFAULT_LIMIT,
): Promise<TriageCardDto[]> {
  const perType = Math.max(8, Math.ceil(limit / 3));

  const [tasks, quantomos, edges] = await Promise.all([
    prisma.pendingTask.findMany({
      where: { status: "suggested" },
      orderBy: [{ createdAt: "asc" }],
      take: perType,
    }),
    prisma.quantomo.findMany({
      where: {
        kgNode: { is: { reconocido: false } },
      },
      include: {
        originAttribution: true,
        kgNode: { select: { id: true, confidence: true } },
      },
      orderBy: { createdAt: "asc" },
      take: perType,
    }),
    prisma.kgEdge.findMany({
      where: { reconocido: false },
      include: {
        sourceNode: { select: { primaryName: true, type: true } },
        targetNode: { select: { primaryName: true, type: true } },
      },
      orderBy: { createdAt: "asc" },
      take: perType,
    }),
  ]);

  const cards: TriageCardDto[] = [];

  for (const task of tasks) {
    cards.push({
      id: task.id,
      entityType: "pending_task",
      title: task.title,
      subtitle: task.description,
      preview: task.description,
      origin: {
        channel: task.source,
        label: formatOriginLabel(task.source, task.sourceRef),
        timestamp: task.createdAt.toISOString(),
      },
      gravity: clampHermeticGravity(task.weight ?? 6),
      createdAt: task.createdAt.toISOString(),
    });
  }

  for (const q of quantomos) {
    const origin = q.originAttribution;
    cards.push({
      id: q.id,
      entityType: "quantomo",
      title: q.titleSugerido,
      subtitle: q.universo,
      preview: q.content.slice(0, 320),
      origin: {
        channel: origin.channel,
        label: formatOriginLabel(
          origin.channel,
          origin.locationName ?? origin.diaSemana,
        ),
        timestamp: origin.timestampExacto.toISOString(),
        locationName: origin.locationName,
      },
      gravity: clampHermeticGravity(
        Math.round((q.kgNode?.confidence ?? 0.6) * 12) || 6,
      ),
      createdAt: q.createdAt.toISOString(),
    });
  }

  for (const edge of edges) {
    cards.push({
      id: edge.id,
      entityType: "kg_edge",
      title: `${edge.sourceNode.primaryName} → ${edge.targetNode.primaryName}`,
      subtitle: edge.relationType,
      preview: edge.context,
      origin: {
        channel: "kg_edge",
        label: formatOriginLabel(
          edge.relationType,
          `${edge.sourceNode.type}↔${edge.targetNode.type}`,
        ),
        timestamp: edge.createdAt.toISOString(),
      },
      gravity: clampHermeticGravity(edge.weight),
      createdAt: edge.createdAt.toISOString(),
    });
  }

  cards.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return cards.slice(0, limit);
}
