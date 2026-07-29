import "server-only";

import fs from "node:fs";
import path from "node:path";

import { getDataPath } from "@/lib/runtime-paths";
import type {
  CalibrationMap,
  ExocortexNamedBy,
  OperationalStatus,
} from "@/lib/yo/types";

const SNAPSHOT_VERSION = 1 as const;

export type YoIdentitySnapshot = {
  version: typeof SNAPSHOT_VERSION;
  operatorName: string;
  exocortexName: string;
  exocortexNamedBy: ExocortexNamedBy | null;
  operationalStatus: OperationalStatus | string;
  energyLevel: number;
  mago12: number;
  mago3: string;
  calibration: CalibrationMap;
  genesisCompletedAt: string | null;
  updatedAt: string;
};

function snapshotPath(): string {
  return getDataPath("memory", "yo-identity.json");
}

function parseCalibration(value: unknown): CalibrationMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: CalibrationMap = {};
  for (const [key, answer] of Object.entries(value)) {
    if (typeof answer === "string" && answer.trim()) {
      out[key] = answer.trim();
    }
  }
  return out;
}

function parseNamedBy(value: unknown): ExocortexNamedBy | null {
  if (value === "operator" || value === "autonomous") return value;
  return null;
}

/** Lee el ancla local del bautismo (sobrevive a reseeds accidentales de SQLite). */
export async function readYoIdentitySnapshot(): Promise<YoIdentitySnapshot | null> {
  const filePath = snapshotPath();
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = await fs.promises.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<YoIdentitySnapshot>;
    const operatorName =
      typeof parsed.operatorName === "string" ? parsed.operatorName.trim() : "";
    const exocortexName =
      typeof parsed.exocortexName === "string" ? parsed.exocortexName.trim() : "";
    if (!operatorName || !exocortexName) return null;

    return {
      version: SNAPSHOT_VERSION,
      operatorName,
      exocortexName,
      exocortexNamedBy: parseNamedBy(parsed.exocortexNamedBy),
      operationalStatus:
        typeof parsed.operationalStatus === "string"
          ? parsed.operationalStatus
          : "CALIBRANDO",
      energyLevel:
        typeof parsed.energyLevel === "number" && Number.isFinite(parsed.energyLevel)
          ? Math.min(10, Math.max(1, Math.round(parsed.energyLevel)))
          : 5,
      mago12:
        typeof parsed.mago12 === "number" && Number.isInteger(parsed.mago12)
          ? Math.min(12, Math.max(1, parsed.mago12))
          : 1,
      mago3: typeof parsed.mago3 === "string" ? parsed.mago3 : "cuerpo",
      calibration: parseCalibration(parsed.calibration),
      genesisCompletedAt:
        typeof parsed.genesisCompletedAt === "string"
          ? parsed.genesisCompletedAt
          : null,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Persiste el bautismo/ADN en disco. Solo escribe si hay ambos nombres. */
export async function persistYoIdentitySnapshot(input: {
  operatorName: string | null;
  exocortexName: string | null;
  exocortexNamedBy?: string | null;
  operationalStatus?: string;
  energyLevel?: number;
  mago12?: number;
  mago3?: string;
  calibration?: unknown;
  genesisCompletedAt?: Date | string | null;
  updatedAt?: Date | string;
}): Promise<void> {
  const operatorName = input.operatorName?.trim() || "";
  const exocortexName = input.exocortexName?.trim() || "";
  if (!operatorName || !exocortexName) return;

  const filePath = snapshotPath();
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

  const snapshot: YoIdentitySnapshot = {
    version: SNAPSHOT_VERSION,
    operatorName,
    exocortexName,
    exocortexNamedBy: parseNamedBy(input.exocortexNamedBy ?? null),
    operationalStatus: input.operationalStatus ?? "CALIBRANDO",
    energyLevel:
      typeof input.energyLevel === "number" && Number.isFinite(input.energyLevel)
        ? Math.min(10, Math.max(1, Math.round(input.energyLevel)))
        : 5,
    mago12:
      typeof input.mago12 === "number" && Number.isInteger(input.mago12)
        ? Math.min(12, Math.max(1, input.mago12))
        : 1,
    mago3: typeof input.mago3 === "string" ? input.mago3 : "cuerpo",
    calibration: parseCalibration(input.calibration),
    genesisCompletedAt: toIsoOrNull(input.genesisCompletedAt),
    updatedAt: toIsoOrNow(input.updatedAt),
  };

  const tmpPath = `${filePath}.tmp`;
  const payload = `${JSON.stringify(snapshot, null, 2)}\n`;
  await fs.promises.writeFile(tmpPath, payload, "utf8");
  try {
    await fs.promises.rename(tmpPath, filePath);
  } catch {
    // Windows: rename sobre archivo existente puede fallar (EPERM).
    await fs.promises.writeFile(filePath, payload, "utf8");
    await fs.promises.unlink(tmpPath).catch(() => undefined);
  }
}

/** Solo el reinicio de fábrica / wipe total debe borrar el ancla. */
export async function clearYoIdentitySnapshot(): Promise<void> {
  const filePath = snapshotPath();
  const tmpPath = `${filePath}.tmp`;
  await Promise.all([
    fs.promises.unlink(filePath).catch(() => undefined),
    fs.promises.unlink(tmpPath).catch(() => undefined),
  ]);
}

function toIsoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function toIsoOrNow(value: Date | string | undefined): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}
