import type { BloquePrioridad } from "@/lib/jornada/types";

/** Palabras clave por bloque de esencia (Eje X). */
export const BLOQUE_KEYWORDS: Record<BloquePrioridad, string[]> = {
  Meta: [
    "objetivo",
    "visión",
    "estrategia",
    "horizonte",
    "okr",
    "prioridad",
    "misión",
    "plan",
    "roadmap",
    "alineación",
  ],
  Salud: [
    "salud",
    "sueño",
    "ejercicio",
    "nutrición",
    "somat",
    "bienestar",
    "médic",
    "hábito",
    "energía",
    "descanso",
    "cardio",
  ],
  Educación: [
    "aprender",
    "estudi",
    "curso",
    "libro",
    "capítulo",
    "formación",
    "conocimiento",
    "memoria",
    "universidad",
    "tutoría",
  ],
  Finanzas: [
    "finanz",
    "presupuesto",
    "inversión",
    "capital",
    "ingreso",
    "gasto",
    "banco",
    "ledger",
    "contabil",
    "impuesto",
    "ahorro",
  ],
  Leyes: [
    "legal",
    "ley",
    "contrato",
    "compliance",
    "norma",
    "regulación",
    "juríd",
    "cláusula",
    "litigio",
    "derecho",
  ],
  Tech: [
    "código",
    "software",
    "api",
    "deploy",
    "refactor",
    "bug",
    "stack",
    "typescript",
    "next.js",
    "gemini",
    "llm",
    "ingeniería",
    "sistema",
    "arquitectura",
  ],
};

/** Modificadores de impacto para Eje Y. */
export const IMPACTO_KEYWORDS: { term: string; delta: number }[] = [
  { term: "crítico", delta: 3 },
  { term: "urgente", delta: 3 },
  { term: "bloqueante", delta: 2 },
  { term: "importante", delta: 2 },
  { term: "alto impacto", delta: +2 },
  { term: "prioritario", delta: 2 },
  { term: "esencial", delta: 1 },
  { term: "menor", delta: -2 },
  { term: "opcional", delta: -2 },
  { term: "trivial", delta: -3 },
  { term: "nice to have", delta: -2 },
];

/** Modificadores de fricción para Eje Z. */
export const FRICCION_KEYWORDS: { term: string; delta: number }[] = [
  { term: "complejo", delta: 3 },
  { term: "arquitectura", delta: 2 },
  { term: "implementar", delta: 2 },
  { term: "refactor", delta: 2 },
  { term: "migración", delta: 3 },
  { term: "integración", delta: 2 },
  { term: "investigación", delta: 2 },
  { term: "simple", delta: -2 },
  { term: "rápido", delta: -2 },
  { term: "trivial", delta: -3 },
  { term: "5 min", delta: -3 },
  { term: "15 min", delta: -2 },
];

export const CHUNK_MIN_LENGTH = 24;
export const CHUNK_MAX_LENGTH = 420;
export const CHUNK_TARGET_LENGTH = 180;

export const MOLECULAR_SIM_DELAY_MS = {
  chunkPerParticula: 45,
  calibratePerParticula: 120,
  minChunk: 400,
  minCalibrate: 600,
} as const;

export const MOLECULAR_STORAGE_DIR = "molecular";
export const MOLECULAR_VALIDATED_FILE = "validated-particles.json";
