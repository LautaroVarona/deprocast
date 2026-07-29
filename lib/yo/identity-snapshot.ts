import "server-only";

import fs from "node:fs";
import path from "node:path";

import { getDataPath } from "@/lib/runtime-paths";
import type {
  CalibrationMap,
  ExocortexNamedBy,
  OperationalStatus,
} from "@/lib/yo/types";

const SNAPSHOT_VERSION = 2 as const;

export type SenadoSnapshotMember = {
  name: string;
  vinculo: string;
};

export type PrimaSnapshot = {
  title: string;
  why?: string;
};

export type YoIdentitySnapshot = {
  version: typeof SNAPSHOT_VERSION | 1;
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
  /** Personas del Senado (Misión II) — sobreviven reseeds de SQLite. */
  senado: SenadoSnapshotMember[];
  /** Proyecto Prima Materia (Misión III). */
  prima: PrimaSnapshot | null;
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

function parseSenado(value: unknown): SenadoSnapshotMember[] {
  if (!Array.isArray(value)) return [];
  const out: SenadoSnapshotMember[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const vinculo = typeof row.vinculo === "string" ? row.vinculo.trim() : "";
    if (!name || !vinculo) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, vinculo });
  }
  return out.slice(0, 12);
}

function parsePrima(value: unknown): PrimaSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const title = typeof row.title === "string" ? row.title.trim() : "";
  if (!title) return null;
  const why = typeof row.why === "string" ? row.why.trim() : "";
  return why ? { title, why } : { title };
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
      senado: parseSenado(parsed.senado),
      prima: parsePrima(parsed.prima),
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
  senado?: SenadoSnapshotMember[];
  prima?: PrimaSnapshot | null;
  /** Si true, fusiona senado/prima con el snapshot existente. */
  mergeGraph?: boolean;
}): Promise<void> {
  const operatorName = input.operatorName?.trim() || "";
  const exocortexName = input.exocortexName?.trim() || "";
  if (!operatorName || !exocortexName) return;

  const existing = input.mergeGraph ? await readYoIdentitySnapshot() : null;

  let senado = parseSenado(input.senado ?? existing?.senado ?? []);
  if (input.mergeGraph && input.senado?.length) {
    const map = new Map(
      (existing?.senado ?? []).map((m) => [m.name.toLowerCase(), m] as const),
    );
    for (const member of input.senado) {
      map.set(member.name.toLowerCase(), member);
    }
    senado = [...map.values()].slice(0, 12);
  }

  const prima =
    input.prima !== undefined
      ? parsePrima(input.prima)
      : (existing?.prima ?? null);

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
    senado,
    prima,
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

/** Añade o actualiza un miembro del Senado en el ancla. */
export async function appendSenadoMemberToSnapshot(input: {
  name: string;
  vinculo: string;
}): Promise<void> {
  const name = input.name.trim();
  const vinculo = input.vinculo.trim();
  if (!name || !vinculo) return;

  const existing = await readYoIdentitySnapshot();
  if (!existing) return;

  await persistYoIdentitySnapshot({
    ...existing,
    senado: [{ name, vinculo }],
    mergeGraph: true,
  });
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

/** Normaliza un payload cliente (localStorage) a snapshot usable. */
export function normalizeClientYoSnapshot(
  raw: unknown,
): YoIdentitySnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const parsed = raw as Partial<YoIdentitySnapshot>;
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
    senado: parseSenado(parsed.senado),
    prima: parsePrima(parsed.prima),
  };
}
