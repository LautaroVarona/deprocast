export type MemoriaAlertSeverity = "info" | "warning" | "error";

export type MemoriaAlertKind =
  | "section_absorbed"
  | "section_missing"
  | "table_missing"
  | "table_empty"
  | "fiscal_mismatch";

export type MemoriaAlert = {
  kind: MemoriaAlertKind;
  severity: MemoriaAlertSeverity;
  sectionNumber?: number;
  message: string;
  details?: Record<string, unknown>;
};

export type MemoriaTable = {
  id: string;
  caption: string | null;
  headers: string[];
  rows: string[][];
  rowCount: number;
  isEmpty: boolean;
};

export type MemoriaSubsection = {
  number: string;
  title: string;
  body: string;
  tables: MemoriaTable[];
};

export type MemoriaSection = {
  number: number;
  title: string;
  canonicalTitle: string;
  body: string;
  subsections: MemoriaSubsection[];
  tables: MemoriaTable[];
  lineStart: number;
  lineEnd: number;
};

export type MemoriaExercise = {
  ejercicio: string;
  sections: MemoriaSection[];
  rawText: string;
};

export type FiscalCoherenceCheck = {
  field: string;
  expected: number | null;
  actual: number | null;
  delta: number | null;
  ok: boolean;
};

export type MemoriaAnalysisResult = {
  ejercicioN: MemoriaExercise;
  ejercicioN1?: MemoriaExercise;
  alerts: MemoriaAlert[];
  fiscalChecks: FiscalCoherenceCheck[];
  sectionIndependenceOk: boolean;
};
