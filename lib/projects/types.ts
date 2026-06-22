import type { CampoSlug } from "@/lib/projects/campos";

export const PROJECT_TIPOS = ["proyecto", "reto", "area"] as const;
export type ProjectTipo = (typeof PROJECT_TIPOS)[number];

export const PROPOSAL_STATUSES = ["pending", "archived", "activated"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const PROPOSAL_ORIGIN_TYPES = ["purifier", "quick_create", "ai_chat"] as const;
export type ProposalOriginType = (typeof PROPOSAL_ORIGIN_TYPES)[number];

export const PROJECT_STATUSES = [
  "Idea",
  "Diseño",
  "Desarrollo",
  "Pruebas",
  "Implantado",
  "Descartado",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type ProgressEntry = {
  fecha: string;
  nota: string;
};

export type Project = {
  id: string;
  title: string;
  tipo: ProjectTipo | null;
  campo: string;
  campoSlug: CampoSlug;
  metaTagsSecundarios: string[];
  description: string;
  responsable: string;
  subpersonasCargo: string[];
  fechaInicio: string;
  fechaObjetivo: string;
  prioridad: number;
  impacto: number;
  dificultad: number;
  horasEstimadas: number;
  horasRealizadas: number;
  avancePorcentaje: number;
  estado: ProjectStatus;
  resultadoFinal: string;
  progressEntries: ProgressEntry[];
  filename: string;
  filePath: string;
};

export type ProjectProposal = {
  id: string;
  title: string;
  status: ProposalStatus;
  originContext: string;
  originType: ProposalOriginType;
  originRef: string | null;
  description: string;
  suggestedCampoSlug: string | null;
  suggestedTipo: ProjectTipo | null;
  mvp: string | null;
  firstStep: string | null;
  priorityReason: string | null;
  sourcePayload: Record<string, unknown> | null;
  activatedProjectId: string | null;
  activatedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProposalInput = {
  title: string;
  originContext?: string;
  originType: ProposalOriginType;
  originRef?: string;
  description?: string;
  suggestedCampoSlug?: string;
  suggestedTipo?: ProjectTipo;
  sourcePayload?: Record<string, unknown>;
};

export type CreateProjectInput = {
  title: string;
  tipo?: ProjectTipo | null;
  campoSlug: CampoSlug;
  metaTagsSecundarios: string[];
  description: string;
  responsable: string;
  subpersonasCargo: string[];
  fechaInicio: string;
  fechaObjetivo: string;
  prioridad: number;
  impacto: number;
  dificultad: number;
  horasEstimadas: number;
  horasRealizadas: number;
  avancePorcentaje: number;
  estado: ProjectStatus;
  resultadoFinal: string;
  notasIniciales?: string;
};

export type AddProgressInput = {
  projectId: string;
  nota: string;
  fecha?: string;
};
