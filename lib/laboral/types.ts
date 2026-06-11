export const LABORAL_CSV_COLUMNS = {
  id: "ID",
  onda: "Área",
  title: "Proyecto / Reto IA",
  responsable: "Responsable",
  createdAt: "Fecha Inicio",
  targetDate: "Fecha Objetivo",
  prioridad: "Prioridad (1-5)",
  impacto: "Impacto (1-5)",
  dificultad: "Dificultad (1-5)",
  horasEstimadas: "Horas Estimadas",
  horasRealizadas: "Horas Realizadas",
  avancePorcentaje: "% Avance",
  estado: "Estado",
  observaciones: "Observaciones (ventajas)",
  puntosMejora: "Puntos de mejora",
} as const;

export type LaboralChallengeStatus =
  | "Idea"
  | "Diseño"
  | "Desarrollo"
  | "Pruebas"
  | "Implantado"
  | "Descartado"
  | string;

export type LaboralChallengeRow = {
  id: string;
  title: string;
  onda: string;
  responsable: string;
  prioridad: number;
  impacto: number;
  dificultad: number | null;
  horasEstimadas: number | null;
  horasRealizadas: number | null;
  avancePorcentaje: number | null;
  estado: LaboralChallengeStatus;
  createdAt: string;
  targetDate: string;
  observaciones: string;
  puntosMejora: string;
};

export type LaboralChallenge = LaboralChallengeRow & {
  baseWeight: number;
  filename: string;
  field: "laboral_varona";
  sourceType: "laboral_challenge";
};

export type ImportResult = {
  imported: number;
  skipped: number;
  files: string[];
  errors: string[];
};
