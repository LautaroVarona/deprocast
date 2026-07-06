import type { AreasRelevancia } from "@/lib/meta-meteador/types";
import { META_AREAS } from "@/lib/meta-meteador/types";
import type { StrongestTag } from "@/lib/archivo/types";

function pickAreaTag(areas: AreasRelevancia | null | undefined): StrongestTag | null {
  if (!areas) return null;

  let best: StrongestTag | null = null;
  for (const area of META_AREAS) {
    const entry = areas[area];
    if (!entry || entry.score_1_12 <= 0) continue;
    if (!best || entry.score_1_12 > best.weight) {
      best = { label: area, weight: entry.score_1_12, kind: "area" };
    }
  }
  return best;
}

export function resolveStrongestTag(
  candidates: Array<StrongestTag | null | undefined>,
): StrongestTag | null {
  let best: StrongestTag | null = null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (!best || candidate.weight > best.weight) {
      best = candidate;
    }
  }
  return best;
}

export function tagFromCampo(
  label: string | null | undefined,
  weight: number,
): StrongestTag | null {
  const trimmed = label?.trim();
  if (!trimmed || weight <= 0) return null;
  return { label: trimmed, weight, kind: "campo" };
}

export function tagFromBaseWeight(
  label: string,
  baseWeight: number,
): StrongestTag | null {
  if (baseWeight <= 0) return null;
  return { label, weight: baseWeight, kind: "base_weight" };
}

export function tagFromOnda(onda: string | null | undefined): StrongestTag | null {
  const trimmed = onda?.trim();
  if (!trimmed) return null;
  return { label: trimmed, weight: 6, kind: "onda" };
}

export function tagFromPrioridad(
  label: string,
  prioridad: number,
  impacto: number,
): StrongestTag | null {
  const weight = Math.max(prioridad, impacto);
  if (weight <= 0) return null;
  return { label, weight, kind: "prioridad" };
}

export function tagFromStringList(
  values: string[],
  defaultWeight = 5,
): StrongestTag | null {
  const label = values.find((value) => value.trim())?.trim();
  if (!label) return null;
  return { label, weight: defaultWeight, kind: "tag" };
}

export { pickAreaTag };
