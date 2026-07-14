import { resolveAgentName } from "@/lib/historial/agent-map";
import type { LogActivityInput } from "@/lib/historial/types";
import { prisma } from "@/lib/prisma";

export async function logActivity(input: LogActivityInput): Promise<string | null> {
  const {
    occurredAt = new Date(),
    category,
    action,
    title,
    summary,
    agentId,
    agentName,
    modelUsed,
    sourceType,
    sourceRef,
    correlationId,
    metadata = {},
  } = input;

  const resolvedAgentName =
    agentName ?? (agentId ? resolveAgentName(agentId) : null);

  try {
    if (sourceType && sourceRef) {
      const existing = await prisma.activityLog.findUnique({
        where: {
          sourceType_sourceRef_action: {
            sourceType,
            sourceRef,
            action,
          },
        },
        select: { id: true },
      });

      if (existing) {
        return existing.id;
      }
    }

    const entry = await prisma.activityLog.create({
      data: {
        occurredAt: occurredAt ?? new Date(),
        category,
        action,
        title,
        summary: summary ?? null,
        agentId: agentId ?? null,
        agentName: resolvedAgentName,
        modelUsed: modelUsed ?? null,
        sourceType: sourceType ?? null,
        sourceRef: sourceRef ?? null,
        correlationId: correlationId ?? null,
        metadata: metadata as object,
      },
    });

    return entry.id;
  } catch (error) {
    console.error("[historial] logActivity error:", error);
    return null;
  }
}
