/** Ancla de Génesis en el navegador — sobrevive cold starts de Vercel. */

import type { YoDto } from "@/lib/yo/types";

const STORAGE_KEY = "deprocast:yo-identity-v2";

export type ClientYoSnapshot = {
  operatorName: string;
  exocortexName: string;
  exocortexNamedBy: string | null;
  operationalStatus: string;
  energyLevel: number;
  mago12: number;
  mago3: string;
  calibration: Record<string, string>;
  genesisCompletedAt: string | null;
  updatedAt: string;
  senado: Array<{ name: string; vinculo: string }>;
  prima: { title: string; why?: string } | null;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function readClientYoSnapshot(): ClientYoSnapshot | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClientYoSnapshot>;
    const operatorName =
      typeof parsed.operatorName === "string" ? parsed.operatorName.trim() : "";
    const exocortexName =
      typeof parsed.exocortexName === "string" ? parsed.exocortexName.trim() : "";
    if (!operatorName || !exocortexName) return null;

    return {
      operatorName,
      exocortexName,
      exocortexNamedBy:
        parsed.exocortexNamedBy === "operator" ||
        parsed.exocortexNamedBy === "autonomous"
          ? parsed.exocortexNamedBy
          : null,
      operationalStatus:
        typeof parsed.operationalStatus === "string"
          ? parsed.operationalStatus
          : "CALIBRANDO",
      energyLevel:
        typeof parsed.energyLevel === "number" ? parsed.energyLevel : 5,
      mago12: typeof parsed.mago12 === "number" ? parsed.mago12 : 1,
      mago3: typeof parsed.mago3 === "string" ? parsed.mago3 : "cuerpo",
      calibration:
        parsed.calibration && typeof parsed.calibration === "object"
          ? parsed.calibration
          : {},
      genesisCompletedAt:
        typeof parsed.genesisCompletedAt === "string"
          ? parsed.genesisCompletedAt
          : null,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
      senado: Array.isArray(parsed.senado)
        ? parsed.senado.filter(
            (m): m is { name: string; vinculo: string } =>
              Boolean(
                m &&
                  typeof m === "object" &&
                  typeof (m as { name?: unknown }).name === "string" &&
                  typeof (m as { vinculo?: unknown }).vinculo === "string",
              ),
          )
        : [],
      prima:
        parsed.prima &&
        typeof parsed.prima === "object" &&
        typeof parsed.prima.title === "string" &&
        parsed.prima.title.trim()
          ? {
              title: parsed.prima.title.trim(),
              why:
                typeof parsed.prima.why === "string"
                  ? parsed.prima.why
                  : undefined,
            }
          : null,
    };
  } catch {
    return null;
  }
}

export function writeClientYoSnapshot(
  yo: YoDto,
  extras?: {
    senado?: Array<{ name: string; vinculo: string }>;
    prima?: { title: string; why?: string } | null;
  },
): void {
  if (!canUseStorage()) return;
  if (!yo.operatorName?.trim() || !yo.exocortexName?.trim()) return;

  const prev = readClientYoSnapshot();
  const senadoMap = new Map(
    (prev?.senado ?? []).map((m) => [m.name.toLowerCase(), m] as const),
  );
  for (const member of extras?.senado ?? []) {
    senadoMap.set(member.name.toLowerCase(), member);
  }

  const snapshot: ClientYoSnapshot = {
    operatorName: yo.operatorName.trim(),
    exocortexName: yo.exocortexName.trim(),
    exocortexNamedBy: yo.exocortexNamedBy,
    operationalStatus: yo.operationalStatus,
    energyLevel: yo.energyLevel,
    mago12: yo.mago12,
    mago3: yo.mago3,
    calibration: yo.calibration,
    genesisCompletedAt: yo.genesisCompletedAt,
    updatedAt: yo.updatedAt,
    senado: [...senadoMap.values()].slice(0, 12),
    prima:
      extras?.prima !== undefined
        ? extras.prima
        : (prev?.prima ??
          (yo.calibration.consecration_prima_objetivo
            ? { title: yo.calibration.consecration_prima_objetivo }
            : null)),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // quota / private mode
  }
}

export function clearClientYoSnapshot(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
