import type { CampoSlug } from "@/lib/projects/campos";

export type TableColumnKey =
  | "id"
  | "title"
  | "prioridad"
  | "tags"
  | "onda"
  | "horasEstimadas"
  | "horasRealizadas"
  | "avancePorcentaje"
  | "estado"
  | "descripcion"
  | "responsable"
  | "impacto"
  | "dificultad"
  | "fechaInicio"
  | "fechaObjetivo";

export type MappedTableRow = {
  id: string;
  title: string;
  prioridad: number;
  impacto: number;
  dificultad: number;
  tags: string[];
  onda: string;
  horasEstimadas: number;
  horasRealizadas: number;
  avancePorcentaje: number;
  estado: string;
  descripcion: string;
  responsable: string;
  fechaInicio: string;
  fechaObjetivo: string;
  extraFields: Record<string, string>;
};

export type TableImportResult = {
  imported: number;
  skipped: number;
  totalRows: number;
  files: string[];
  errors: string[];
  columnMapping: Partial<Record<TableColumnKey, string>>;
};

export type TableImportOptions = {
  campoSlug?: CampoSlug | null;
  buffer: Buffer;
  filename: string;
};
