import type { CampoSlug } from "@/lib/projects/campos";

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

export type CreateProjectInput = {
  title: string;
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
};
