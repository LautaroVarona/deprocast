import "server-only";

import { resolvePersonaNames } from "@/lib/kg/personas";
import { isCampoSlug, resolveCampoSlug } from "@/lib/projects/campos";
import { createProject } from "@/lib/projects/service";
import {
  getProposal,
  markProposalActivated,
} from "@/lib/projects/proposal-store";
import type { Project, ProjectTipo } from "@/lib/projects/types";
import { PROJECT_TIPOS } from "@/lib/projects/types";
import { clampScale } from "@/lib/projects/priority";

export type ActivateProposalDimensions = {
  materia?: string;
  particula?: string;
  onda?: string;
  espacio?: string;
};

export type ActivateProposalInput = {
  proposalId: string;
  mvp: string;
  firstStep: string;
  priorityReason: string;
  tipo: ProjectTipo;
  campoSlug: string;
  personIds?: string[];
  gravity?: {
    prioridad?: number;
    impacto?: number;
    dificultad?: number;
  };
  dimensions?: ActivateProposalDimensions;
  densityLevel?: "simple" | "moderado" | "completo";
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseProjectTipo(value: string): ProjectTipo | null {
  return PROJECT_TIPOS.includes(value as ProjectTipo) ? (value as ProjectTipo) : null;
}

function extractGravity(payload: Record<string, unknown> | null): {
  prioridad: number;
  impacto: number;
  dificultad: number;
} {
  const gravity = payload?.gravity as Record<string, unknown> | undefined;
  const dimensions = payload?.dimensions as Record<string, unknown> | undefined;

  return {
    prioridad: clampScale(Number(gravity?.prioridad ?? dimensions?.prioridad ?? 6)),
    impacto: clampScale(Number(gravity?.impacto ?? dimensions?.impacto ?? 6)),
    dificultad: clampScale(Number(gravity?.dificultad ?? dimensions?.dificultad ?? 6)),
  };
}

function extractMetaTags(payload: Record<string, unknown> | null): string[] {
  const tags = payload?.metaTagsSecundarios;
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
}

function buildValidationNote(
  mvp: string,
  firstStep: string,
  priorityReason: string,
): string {
  return [
    "Activación desde incubadora.",
    `MVP: ${mvp.trim()}`,
    `Primer paso hoy: ${firstStep.trim()}`,
    `Prioridad ahora: ${priorityReason.trim()}`,
  ].join(" ");
}

export async function activateProposal(input: ActivateProposalInput): Promise<Project> {
  const proposal = await getProposal(input.proposalId);
  if (!proposal) {
    throw new Error("Propuesta no encontrada.");
  }
  if (proposal.status !== "pending") {
    throw new Error("Solo se pueden activar propuestas pendientes.");
  }

  const isSimple = input.densityLevel === "simple";
  const mvp = input.mvp.trim() || (isSimple ? "Por definir en refinamiento" : "");
  const firstStep =
    input.firstStep.trim() || (isSimple ? "Delimitar alcance inicial" : "");
  const priorityReason =
    input.priorityReason.trim() ||
    (isSimple ? "Captura rápida desde incubadora" : "");
  const tipo = parseProjectTipo(input.tipo);

  if (!isSimple && (!mvp || !firstStep || !priorityReason)) {
    throw new Error("Completá MVP, primer paso y motivo de prioridad antes de activar.");
  }
  if (!tipo) {
    throw new Error("Seleccioná un tipo válido: proyecto, reto o área.");
  }
  if (!isCampoSlug(input.campoSlug)) {
    throw new Error("Seleccioná un Campo válido.");
  }

  const campoSlug = resolveCampoSlug(input.campoSlug);
  const baseGravity = extractGravity(proposal.sourcePayload);
  const gravity = {
    prioridad: clampScale(Number(input.gravity?.prioridad ?? baseGravity.prioridad)),
    impacto: clampScale(Number(input.gravity?.impacto ?? baseGravity.impacto)),
    dificultad: clampScale(
      Number(input.gravity?.dificultad ?? baseGravity.dificultad),
    ),
  };
  const personIds = (input.personIds ?? []).filter(Boolean);
  const subpersonasCargo = await resolvePersonaNames(personIds);
  const metaTags = extractMetaTags(proposal.sourcePayload);
  const markdownBody =
    typeof proposal.sourcePayload?.markdownBody === "string"
      ? proposal.sourcePayload.markdownBody
      : "";

  const descriptionParts = [proposal.description.trim(), markdownBody.trim()].filter(Boolean);
  const description = descriptionParts.join("\n\n").slice(0, 2000);

  const project = await createProject({
    title: proposal.title,
    tipo,
    campoSlug,
    metaTagsSecundarios: metaTags,
    description,
    responsable: "",
    subpersonasCargo,
    fechaInicio: todayIsoDate(),
    fechaObjetivo: "",
    prioridad: gravity.prioridad,
    impacto: gravity.impacto,
    dificultad: gravity.dificultad,
    horasEstimadas: 0,
    horasRealizadas: 0,
    avancePorcentaje: 0,
    estado: "Idea",
    resultadoFinal: "",
    notasIniciales: buildValidationNote(mvp, firstStep, priorityReason),
  });

  await markProposalActivated(proposal.id, project.id);

  void (async () => {
    try {
      const { ingestSingleProject } = await import("@/lib/kg/sources");
      await ingestSingleProject(project);
    } catch (error) {
      console.error("KG project hook error (activate proposal):", error);
    }
  })();

  return project;
}
