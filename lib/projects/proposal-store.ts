import "server-only";

import { prisma } from "@/lib/prisma";
import { isCampoSlug } from "@/lib/projects/campos";
import type {
  CreateProposalInput,
  ProjectProposal,
  ProjectTipo,
  ProposalOriginType,
  ProposalStatus,
} from "@/lib/projects/types";
import { PROJECT_TIPOS, PROPOSAL_ORIGIN_TYPES, PROPOSAL_STATUSES } from "@/lib/projects/types";
import type { Prisma } from "@prisma/client";

function parseProposalStatus(value: string): ProposalStatus {
  return PROPOSAL_STATUSES.includes(value as ProposalStatus)
    ? (value as ProposalStatus)
    : "pending";
}

function parseOriginType(value: string): ProposalOriginType {
  return PROPOSAL_ORIGIN_TYPES.includes(value as ProposalOriginType)
    ? (value as ProposalOriginType)
    : "quick_create";
}

function parseProjectTipo(value: string | null | undefined): ProjectTipo | null {
  if (!value) return null;
  return PROJECT_TIPOS.includes(value as ProjectTipo) ? (value as ProjectTipo) : null;
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function mapRow(row: {
  id: string;
  title: string;
  status: string;
  originContext: string;
  originType: string;
  originRef: string | null;
  description: string;
  suggestedCampoSlug: string | null;
  suggestedTipo: string | null;
  mvp: string | null;
  firstStep: string | null;
  priorityReason: string | null;
  sourcePayload: unknown;
  activatedProjectId: string | null;
  activatedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ProjectProposal {
  return {
    id: row.id,
    title: row.title,
    status: parseProposalStatus(row.status),
    originContext: row.originContext,
    originType: parseOriginType(row.originType),
    originRef: row.originRef,
    description: row.description,
    suggestedCampoSlug: row.suggestedCampoSlug,
    suggestedTipo: parseProjectTipo(row.suggestedTipo),
    mvp: row.mvp,
    firstStep: row.firstStep,
    priorityReason: row.priorityReason,
    sourcePayload:
      row.sourcePayload && typeof row.sourcePayload === "object"
        ? (row.sourcePayload as Record<string, unknown>)
        : null,
    activatedProjectId: row.activatedProjectId,
    activatedAt: toIso(row.activatedAt),
    archivedAt: toIso(row.archivedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function buildOriginContext(
  originType: ProposalOriginType,
  createdAt: Date,
  options?: { title?: string; sourceLabel?: string },
): string {
  const dateStr = createdAt.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  switch (originType) {
    case "purifier":
      return `Surgió al purificar contenido el ${dateStr}`;
    case "ai_chat":
      return `Surgió en la charla del ${dateStr}`;
    case "quick_create":
    default:
      if (options?.sourceLabel) {
        return `${options.sourceLabel} (${dateStr})`;
      }
      return `Captura rápida del ${dateStr}`;
  }
}

export async function createProposal(input: CreateProposalInput): Promise<ProjectProposal> {
  const title = input.title.trim();
  if (!title) {
    throw new Error("El título de la propuesta es obligatorio.");
  }

  const now = new Date();
  const suggestedCampoSlug =
    input.suggestedCampoSlug && isCampoSlug(input.suggestedCampoSlug)
      ? input.suggestedCampoSlug
      : null;

  const row = await prisma.projectProposal.create({
    data: {
      title,
      status: "pending",
      originContext:
        input.originContext?.trim() ||
        buildOriginContext(input.originType, now, { title }),
      originType: input.originType,
      originRef: input.originRef ?? null,
      description: input.description?.trim() ?? "",
      suggestedCampoSlug,
      suggestedTipo: input.suggestedTipo ?? null,
      sourcePayload: input.sourcePayload
        ? (JSON.parse(JSON.stringify(input.sourcePayload)) as Prisma.InputJsonValue)
        : undefined,
    },
  });

  return mapRow(row);
}

export async function listProposals(options?: {
  status?: ProposalStatus;
}): Promise<ProjectProposal[]> {
  const status = options?.status ?? "pending";

  const rows = await prisma.projectProposal.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(mapRow);
}

export async function countProposals(status: ProposalStatus = "pending"): Promise<number> {
  return prisma.projectProposal.count({ where: { status } });
}

export async function getProposal(id: string): Promise<ProjectProposal | null> {
  const row = await prisma.projectProposal.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}

export async function updateProposalValidation(
  id: string,
  fields: {
    mvp?: string;
    firstStep?: string;
    priorityReason?: string;
    suggestedCampoSlug?: string;
    suggestedTipo?: ProjectTipo;
  },
): Promise<ProjectProposal> {
  const existing = await prisma.projectProposal.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Propuesta no encontrada.");
  }
  if (existing.status !== "pending") {
    throw new Error("Solo se pueden editar propuestas pendientes.");
  }

  const suggestedCampoSlug =
    fields.suggestedCampoSlug !== undefined
      ? fields.suggestedCampoSlug && isCampoSlug(fields.suggestedCampoSlug)
        ? fields.suggestedCampoSlug
        : null
      : undefined;

  const row = await prisma.projectProposal.update({
    where: { id },
    data: {
      mvp: fields.mvp !== undefined ? fields.mvp.trim() || null : undefined,
      firstStep:
        fields.firstStep !== undefined ? fields.firstStep.trim() || null : undefined,
      priorityReason:
        fields.priorityReason !== undefined
          ? fields.priorityReason.trim() || null
          : undefined,
      suggestedCampoSlug,
      suggestedTipo: fields.suggestedTipo ?? undefined,
    },
  });

  return mapRow(row);
}

export async function archiveProposal(id: string): Promise<ProjectProposal> {
  const existing = await prisma.projectProposal.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Propuesta no encontrada.");
  }
  if (existing.status !== "pending") {
    throw new Error("Solo se pueden archivar propuestas pendientes.");
  }

  const row = await prisma.projectProposal.update({
    where: { id },
    data: {
      status: "archived",
      archivedAt: new Date(),
    },
  });

  return mapRow(row);
}

export async function markProposalActivated(
  id: string,
  projectId: string,
): Promise<ProjectProposal> {
  const row = await prisma.projectProposal.update({
    where: { id },
    data: {
      status: "activated",
      activatedProjectId: projectId,
      activatedAt: new Date(),
    },
  });

  return mapRow(row);
}
