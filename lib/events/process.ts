import "server-only";

import { createProposedEvents } from "@/lib/events/service";
import type { ContextEventDto, EventLinkInput } from "@/lib/events/types";
import { extractEventsFromText } from "@/lib/events/extract";
import { listProjects } from "@/lib/projects/service";
import { randomUUID } from "node:crypto";

function resolveProjectId(
  label: string,
  projects: Awaited<ReturnType<typeof listProjects>>,
): { id: string; label: string } | null {
  const normalized = label.toLowerCase().trim();
  const match =
    projects.find((p) => p.id === label) ??
    projects.find((p) => p.title.toLowerCase() === normalized) ??
    projects.find((p) => p.title.toLowerCase().includes(normalized)) ??
    projects.find((p) => normalized.includes(p.title.toLowerCase()));

  return match ? { id: match.id, label: match.title } : null;
}

export async function processJournalForEvents(input: {
  journalId: string;
  content: string;
  occurredAt: Date;
}): Promise<ContextEventDto[]> {
  const extraction = await extractEventsFromText(input.content);
  if (extraction.events.length === 0) {
    return [];
  }

  const projects = await listProjects();
  const correlationId = randomUUID();

  const events = extraction.events.map((item) => {
    const links: EventLinkInput[] = item.projectLinks
      .map((link): EventLinkInput | null => {
        const resolved = resolveProjectId(
          link.projectId ?? link.projectLabel,
          projects,
        );
        if (!resolved) return null;
        return {
          entityType: "proyecto",
          entityId: resolved.id,
          entityLabel: resolved.label,
          linkRole: "related",
        };
      })
      .filter((link): link is EventLinkInput => link !== null);

    if (item.pillar === "proyecto" && links.length === 0 && item.projectLinks[0]) {
      links.push({
        entityType: "proyecto",
        entityId: item.projectLinks[0].projectLabel,
        entityLabel: item.projectLinks[0].projectLabel,
        linkRole: "primary" as const,
      });
    }

    links.push({
      entityType: "journal",
      entityId: input.journalId,
      entityLabel: input.journalId,
      linkRole: "related",
    });

    return {
      content: item.summary,
      pillar: item.pillar,
      structuredData: {
        ...item.structuredData,
        summary: item.summary,
        ...(item.pillar === "proyecto" && item.projectLinks[0]?.note
          ? { note: item.projectLinks[0].note }
          : {}),
      },
      summary: item.summary,
      links,
    };
  });

  return createProposedEvents({
    source: "journal",
    sourceRef: input.journalId,
    occurredAt: input.occurredAt,
    correlationId,
    events,
  });
}

export async function processChatForEvents(input: {
  messageId: string;
  userContent: string;
  assistantContent: string;
  occurredAt: Date;
  mentions: Array<{ entityType: string; entityId: string; label: string }>;
}): Promise<ContextEventDto[]> {
  const combined = `Usuario: ${input.userContent}\nAsistente: ${input.assistantContent}`;
  const extraction = await extractEventsFromText(combined);
  if (extraction.events.length === 0) {
    return [];
  }

  const projects = await listProjects();
  const correlationId = randomUUID();

  const mentionLinks: EventLinkInput[] = input.mentions
    .filter((m) => m.entityType === "proyecto")
    .map((m) => ({
      entityType: "proyecto" as const,
      entityId: m.entityId,
      entityLabel: m.label,
      linkRole: "related" as const,
    }));

  const events = extraction.events.map((item) => {
    const links: EventLinkInput[] = [...mentionLinks];

    for (const pl of item.projectLinks) {
      const resolved = resolveProjectId(
        pl.projectId ?? pl.projectLabel,
        projects,
      );
      if (resolved) {
        links.push({
          entityType: "proyecto",
          entityId: resolved.id,
          entityLabel: resolved.label,
          linkRole: "related",
        });
      }
    }

    links.push({
      entityType: "chat_message",
      entityId: input.messageId,
      entityLabel: input.messageId,
      linkRole: "related",
    });

    return {
      content: item.summary,
      pillar: item.pillar,
      structuredData: {
        ...item.structuredData,
        summary: item.summary,
      },
      summary: item.summary,
      links,
    };
  });

  return createProposedEvents({
    source: "chat",
    sourceRef: input.messageId,
    occurredAt: input.occurredAt,
    correlationId,
    events,
  });
}
