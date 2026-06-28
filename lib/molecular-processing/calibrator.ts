import { BLOQUE_PRIORITY_INDEX } from "@/lib/jornada/constants";
import type { BloquePrioridad } from "@/lib/jornada/types";
import { clampAxis, computeTaskCurrency } from "@/lib/jornada/utils";
import {
  BLOQUE_KEYWORDS,
  FRICCION_KEYWORDS,
  IMPACTO_KEYWORDS,
  MOLECULAR_SIM_DELAY_MS,
} from "./constants";
import type {
  CalibracionPropuesta,
  CalibratorInput,
  CalibratorResult,
  ParticulaConPropuesta,
  ParticulaMetadata,
} from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function scoreBloque(text: string, bloque: BloquePrioridad): number {
  const normalized = normalizeForMatch(text);
  return BLOQUE_KEYWORDS[bloque].reduce((score, keyword) => {
    const normalizedKeyword = normalizeForMatch(keyword);
    return normalized.includes(normalizedKeyword) ? score + 1 : score;
  }, 0);
}

function inferEjeX(text: string): { bloque: BloquePrioridad; razon: string } {
  const scores = (Object.keys(BLOQUE_KEYWORDS) as BloquePrioridad[]).map(
    (bloque) => ({
      bloque,
      score: scoreBloque(text, bloque),
    }),
  );

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const second = scores[1];

  if (!best || best.score === 0) {
    return {
      bloque: "Meta",
      razon: "Sin señales dominantes — asignación por defecto al bloque Meta.",
    };
  }

  const margin = best.score - (second?.score ?? 0);
  return {
    bloque: best.bloque,
    razon:
      margin >= 2
        ? `Señal fuerte hacia ${best.bloque} (${best.score} coincidencias).`
        : `Señal leve hacia ${best.bloque}; revisar manualmente.`,
  };
}

function inferEjeY(text: string): { value: number; razon: string } {
  const normalized = normalizeForMatch(text);
  let base = 6;

  const lengthBoost = Math.min(3, Math.floor(text.length / 200));
  base += lengthBoost;

  for (const { term, delta } of IMPACTO_KEYWORDS) {
    if (normalized.includes(normalizeForMatch(term))) {
      base += delta;
    }
  }

  const exclamationBoost = (text.match(/!/gu) ?? []).length;
  base += Math.min(2, exclamationBoost);

  const value = clampAxis(base);
  return {
    value,
    razon: `Impacto inferido por densidad semántica y marcadores de urgencia (base ${value}).`,
  };
}

function inferEjeZ(text: string): { value: number; razon: string } {
  const normalized = normalizeForMatch(text);
  let base = 5;

  const technicalDensity = (
    normalized.match(
      /\b(implementar|refactor|arquitectura|integrar|migrar|configurar|desplegar)\b/gu,
    ) ?? []
  ).length;
  base += Math.min(3, technicalDensity);

  for (const { term, delta } of FRICCION_KEYWORDS) {
    if (normalized.includes(normalizeForMatch(term))) {
      base += delta;
    }
  }

  const value = clampAxis(base);
  return {
    value,
    razon: `Fricción inferida por complejidad léxica y verbos de ejecución (base ${value}).`,
  };
}

function buildPropuesta(text: string): CalibracionPropuesta {
  const { bloque, razon: razonX } = inferEjeX(text);
  const { value: ejeY, razon: razonY } = inferEjeY(text);
  const { value: ejeZ, razon: razonZ } = inferEjeZ(text);

  const bloqueIndex = BLOQUE_PRIORITY_INDEX[bloque] + 1;
  const confianza = Math.min(
    0.95,
    0.55 +
      scoreBloque(text, bloque) * 0.08 +
      (ejeY !== 6 ? 0.05 : 0) +
      (ejeZ !== 5 ? 0.05 : 0),
  );

  return {
    ejeX: bloque,
    ejeY,
    ejeZ,
    currencyPotencial: computeTaskCurrency(ejeY, ejeZ),
    confianza: Number(confianza.toFixed(2)),
    razonamiento: `[X→${bloque} (${bloqueIndex}/6)] ${razonX} · [Y=${ejeY}] ${razonY} · [Z=${ejeZ}] ${razonZ}`,
  };
}

export function calibrateParticula(
  particula: ParticulaMetadata,
): ParticulaConPropuesta {
  const propuesta = buildPropuesta(particula.textoFragmento);
  return { ...particula, propuesta };
}

export async function runMolecularCalibrator(
  input: CalibratorInput,
): Promise<CalibratorResult> {
  const started = Date.now();
  const particulas: ParticulaConPropuesta[] = [];

  for (const particula of input.particulas) {
    particulas.push(calibrateParticula(particula));
    await sleep(MOLECULAR_SIM_DELAY_MS.calibratePerParticula);
  }

  const elapsed = Date.now() - started;
  await sleep(
    Math.max(0, MOLECULAR_SIM_DELAY_MS.minCalibrate - elapsed),
  );

  return {
    particulas,
    duracionMs: Date.now() - started,
  };
}

export function bloqueToSliderValue(bloque: BloquePrioridad): number {
  return BLOQUE_PRIORITY_INDEX[bloque] + 1;
}

export function sliderValueToBloque(value: number): BloquePrioridad {
  const index = clampAxis(value) - 1;
  const bloques = Object.keys(BLOQUE_PRIORITY_INDEX) as BloquePrioridad[];
  return bloques[Math.min(index, bloques.length - 1)] ?? "Meta";
}
