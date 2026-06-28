import type { BloquePrioridad } from "@/lib/jornada/types";

/** Metadatos mínimos de una partícula tras el chunkeo semántico. */
export type ParticulaMetadata = {
  id: string;
  textoFragmento: string;
  fuenteOrigen: string;
  fechaIngesta: string;
};

export type CalibracionEjes = {
  /** Esencia — bloque de prioridad (1–6 mapeado internamente). */
  ejeX: BloquePrioridad;
  /** Valor del puntaje — impacto percibido (1–12). */
  ejeY: number;
  /** Fricción / esfuerzo de ejecución (1–12). */
  ejeZ: number;
};

export type CalibracionPropuesta = CalibracionEjes & {
  currencyPotencial: number;
  /** Confianza simulada del agente (0–1). */
  confianza: number;
  razonamiento: string;
};

export type ParticulaConPropuesta = ParticulaMetadata & {
  propuesta: CalibracionPropuesta;
};

export type ParticulaValidada = ParticulaMetadata &
  CalibracionEjes & {
    currencyPotencial: number;
    validada: true;
    validadaAt: string;
    /** Valores originales propuestos por el agente (auditoría HITL). */
    propuestaOriginal: CalibracionPropuesta;
  };

export type ChunkerInput = {
  texto: string;
  fuenteOrigen?: string;
};

export type ChunkerResult = {
  particulas: ParticulaMetadata[];
  totalCaracteres: number;
  totalParticulas: number;
  duracionMs: number;
};

export type CalibratorInput = {
  particulas: ParticulaMetadata[];
};

export type CalibratorResult = {
  particulas: ParticulaConPropuesta[];
  duracionMs: number;
};

export type ValidateInput = {
  particula: ParticulaMetadata &
    CalibracionEjes & {
      propuestaOriginal: CalibracionPropuesta;
      currencyPotencial?: number;
    };
};

export type PipelinePhase =
  | "idle"
  | "chunking"
  | "disintegrating"
  | "calibrating"
  | "validating"
  | "complete";

export type MolecularPipelineState = {
  phase: PipelinePhase;
  textoOriginal: string;
  fuenteOrigen: string;
  particulas: ParticulaMetadata[];
  calibraciones: ParticulaConPropuesta[];
  validadas: ParticulaValidada[];
};
