import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildConsecrationProgress,
  deriveGenesisStatus,
  isMissionIComplete,
  isMissionIIIComplete,
} from "@/lib/yo/consecration";
import {
  resolveExocortexDisplayName,
  resolveOperatorDisplayName,
} from "@/lib/yo/display-names";
import {
  persistYoIdentitySnapshot,
  readYoIdentitySnapshot,
} from "@/lib/yo/identity-snapshot";
import {
  CONSECRATION_PERSONA_TARGET,
  DEFAULT_EXOCORTEX_NAME,
  YO_CORE_ID,
  type CalibrationMap,
  type ExocortexNamedBy,
  type Mago3Phase,
  type OperationalClockInput,
  type PatchYoInput,
  type YoConduitMessageDto,
  type YoDto,
  isMago3Phase,
} from "@/lib/yo/types";
import type { Prisma } from "@prisma/client";

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

function parseNamedBy(value: string | null): ExocortexNamedBy | null {
  if (value === "operator" || value === "autonomous") return value;
  return null;
}

function parseMago3(value: unknown): Mago3Phase {
  if (typeof value === "string" && isMago3Phase(value)) return value;
  return "cuerpo";
}

function parseMago12(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return Math.min(12, Math.max(1, value));
  }
  return 1;
}

type YoRow = {
  id: string;
  operatorName: string | null;
  exocortexName: string | null;
  exocortexNamedBy: string | null;
  operationalStatus: string;
  energyLevel: number;
  mago12?: number | null;
  mago3?: string | null;
  calibration: unknown;
  genesisCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

async function toDto(row: YoRow): Promise<YoDto> {
  const calibration = parseCalibration(row.calibration);
  // Hub YO siempre en KG si hay nombre (cuenta como Persona).
  if (row.operatorName?.trim()) {
    const { ensureOperatorPersonaNode } = await import("@/lib/yo/operator-node");
    await ensureOperatorPersonaNode(row.operatorName);
  }
  const consecration = await buildConsecrationProgress(calibration);
  const genesisStatus = deriveGenesisStatus({
    ...row,
    calibration,
    senadoComplete: consecration.personaCount >= CONSECRATION_PERSONA_TARGET,
  });

  const dto: YoDto = {
    id: row.id,
    operatorName: row.operatorName,
    exocortexName: row.exocortexName,
    exocortexNamedBy: parseNamedBy(row.exocortexNamedBy),
    operationalStatus: row.operationalStatus,
    energyLevel: row.energyLevel,
    mago12: parseMago12(row.mago12),
    mago3: parseMago3(row.mago3),
    calibration,
    genesisStatus,
    genesisCompleted: genesisStatus === "COMPLETED",
    genesisCompletedAt: row.genesisCompletedAt?.toISOString() ?? null,
    consecration,
    updatedAt: row.updatedAt.toISOString(),
  };

  // Ancla en disco: el bautismo no debe depender solo de SQLite.
  if (dto.operatorName?.trim() && dto.exocortexName?.trim()) {
    await persistYoIdentitySnapshot({
      operatorName: dto.operatorName,
      exocortexName: dto.exocortexName,
      exocortexNamedBy: dto.exocortexNamedBy,
      operationalStatus: dto.operationalStatus,
      energyLevel: dto.energyLevel,
      mago12: dto.mago12,
      mago3: dto.mago3,
      calibration: dto.calibration,
      genesisCompletedAt: dto.genesisCompletedAt,
      updatedAt: dto.updatedAt,
    });
  }

  return dto;
}

/**
 * Si SQLite perdió los nombres (reseed, carrera, tabla recreada) pero el
 * ancla en data/memory/yo-identity.json sigue, rehidrata el singleton.
 */
async function restoreYoFromSnapshotIfNeeded(row: YoRow): Promise<YoRow> {
  const hasNames = Boolean(
    row.operatorName?.trim() && row.exocortexName?.trim(),
  );
  if (hasNames) return row;

  const snap = await readYoIdentitySnapshot();
  if (!snap) return row;

  const calibration = {
    ...snap.calibration,
    ...parseCalibration(row.calibration),
  };

  return prisma.yo.update({
    where: { id: YO_CORE_ID },
    data: {
      operatorName: snap.operatorName,
      exocortexName: snap.exocortexName,
      exocortexNamedBy: snap.exocortexNamedBy,
      operationalStatus: snap.operationalStatus || row.operationalStatus,
      energyLevel: snap.energyLevel || row.energyLevel,
      mago12: snap.mago12,
      mago3: snap.mago3,
      calibration: calibration as Prisma.InputJsonValue,
      genesisCompletedAt: snap.genesisCompletedAt
        ? new Date(snap.genesisCompletedAt)
        : null,
    },
  });
}

export async function ensureYoShell(): Promise<YoDto> {
  const found = await prisma.yo.findUnique({ where: { id: YO_CORE_ID } });
  let row: YoRow;

  if (!found) {
    const snap = await readYoIdentitySnapshot();
    row = await prisma.yo.create({
      data: snap
        ? {
            id: YO_CORE_ID,
            operatorName: snap.operatorName,
            exocortexName: snap.exocortexName,
            exocortexNamedBy: snap.exocortexNamedBy,
            operationalStatus: snap.operationalStatus || "CALIBRANDO",
            energyLevel: snap.energyLevel,
            mago12: snap.mago12,
            mago3: snap.mago3,
            calibration: snap.calibration as Prisma.InputJsonValue,
            genesisCompletedAt: snap.genesisCompletedAt
              ? new Date(snap.genesisCompletedAt)
              : null,
          }
        : {
            id: YO_CORE_ID,
            operationalStatus: "STANDBY",
            energyLevel: 5,
            calibration: {},
          },
    });
  } else {
    row = await restoreYoFromSnapshotIfNeeded(found);
  }

  const dto = await toDto(row);

  // Solo reabrir si el sellado es claramente inválido por calibration
  // (Nosce/Prima). No tocar el sello por conteo de Senado: ese check es
  // frágil ante hubs/operador renombrados y metía al Operador en un loop /yo.
  if (row.genesisCompletedAt && dto.genesisStatus === "PENDING_MISSIONS") {
    const calibration = parseCalibration(row.calibration);
    const missionsBroken =
      !isMissionIComplete(calibration) || !isMissionIIIComplete(calibration);
    if (missionsBroken) {
      const reopened = await prisma.yo.update({
        where: { id: YO_CORE_ID },
        data: {
          genesisCompletedAt: null,
          operationalStatus: "STANDBY",
        },
      });
      return toDto(reopened);
    }
  }

  return dto;
}

export async function getYo(): Promise<YoDto> {
  return ensureYoShell();
}

export async function baptizeOperator(operatorName: string): Promise<YoDto> {
  await ensureYoShell();
  const updated = await prisma.yo.update({
    where: { id: YO_CORE_ID },
    data: {
      operatorName: operatorName.trim(),
      operationalStatus: "CALIBRANDO",
    },
  });

  // El nombre del Operador ancla el hub de todos los grafos.
  const { ensureOperatorPersonaNode } = await import("@/lib/yo/operator-node");
  await ensureOperatorPersonaNode();

  return toDto(updated);
}

/**
 * Cierra el bautismo de nombres y deja al Operador en PENDING_MISSIONS.
 * No marca genesisCompletedAt — eso ocurre al cerrar la Misión III.
 */
export async function baptizeExocortex(input: {
  exocortexName: string;
  namedBy: ExocortexNamedBy;
}): Promise<YoDto> {
  await ensureYoShell();
  const current = await prisma.yo.findUniqueOrThrow({
    where: { id: YO_CORE_ID },
  });

  if (!current.operatorName?.trim()) {
    throw new Error("Primero debe bautizarse tu nombre.");
  }

  const updated = await prisma.yo.update({
    where: { id: YO_CORE_ID },
    data: {
      exocortexName: input.exocortexName.trim() || DEFAULT_EXOCORTEX_NAME,
      exocortexNamedBy: input.namedBy,
      // Veteranos ya sellados siguen OPERATIVO; nuevos entran a misiones.
      operationalStatus: current.genesisCompletedAt
        ? "OPERATIVO"
        : "CALIBRANDO",
    },
  });

  return toDto(updated);
}

export async function saveCalibrationEntry(
  promptId: string,
  answer: string,
): Promise<YoDto> {
  const current = await ensureYoShell();
  if (current.genesisStatus === "PENDING_NAMES") {
    throw new Error("Génesis incompleta. Completá el bautismo de nombres.");
  }

  const calibration = {
    ...current.calibration,
    [promptId]: answer.trim(),
  };

  const updated = await prisma.yo.update({
    where: { id: YO_CORE_ID },
    data: {
      calibration: calibration as Prisma.InputJsonValue,
    },
  });

  const yo = await toDto(updated);
  return maybeCompleteConsecration(yo);
}

/** Sella las tres señales de Nosce Te Ipsum de una sola vez (modal). */
export async function saveNosceMissionAnswers(input: {
  exoesqueleto: string;
  primaMateria: string;
  esperanza: string;
}): Promise<YoDto> {
  const current = await ensureYoShell();

  if (!current.operatorName?.trim() || !current.exocortexName?.trim()) {
    throw new Error(
      "Completá el bautismo de nombres antes de finalizar la Misión I.",
    );
  }

  if (isMissionIComplete(current.calibration)) {
    throw new Error("Nosce Te Ipsum ya está sellado.");
  }

  const calibration = {
    ...current.calibration,
    consecration_exoesqueleto: input.exoesqueleto.trim(),
    consecration_prima_materia: input.primaMateria.trim(),
    consecration_esperanza: input.esperanza.trim(),
  };

  const updated = await prisma.yo.update({
    where: { id: YO_CORE_ID },
    data: {
      calibration: calibration as Prisma.InputJsonValue,
      // Si el sello de génesis quedó marcado sin ADN, reabrir consagración.
      ...(current.genesisCompletedAt
        ? {
            genesisCompletedAt: null,
            operationalStatus: "CALIBRANDO",
          }
        : {}),
    },
  });

  const exocortex = current.exocortexName ?? DEFAULT_EXOCORTEX_NAME;
  await appendConduitMessage({
    role: "exocortex",
    content: `ADN personal indexado. Telemetría de energía desbloqueada. Misión I sellada — El Senado espera. ${exocortex} confirma el sello.`,
  });

  const yo = await toDto(updated);
  return maybeCompleteConsecration(yo);
}

/** Sella la Misión III (Prima Materia) creando el proyecto real y marcando calibration. */
export async function savePrimaMissionObjective(input: {
  title: string;
  why?: string;
}): Promise<YoDto> {
  const current = await ensureYoShell();
  const title = input.title.trim();
  if (!title) {
    throw new Error("El objetivo a 90 días es obligatorio.");
  }

  if (!current.operatorName?.trim() || !current.exocortexName?.trim()) {
    throw new Error("Completá el bautismo de nombres antes de Prima Materia.");
  }

  if (current.consecration.missions.find((m) => m.id === "senado")?.status !== "completed") {
    throw new Error("Completá El Senado (Misión II) antes de Prima Materia.");
  }

  const { bootstrapGenesisProject } = await import(
    "@/lib/projects/genesis-bootstrap"
  );
  await bootstrapGenesisProject({
    title,
    why: input.why,
    operatorName: current.operatorName,
  });

  const { CONSECRATION_MISSION_III_KEY } = await import("@/lib/yo/types");
  const calibration = {
    ...current.calibration,
    [CONSECRATION_MISSION_III_KEY]: title,
  };

  const updated = await prisma.yo.update({
    where: { id: YO_CORE_ID },
    data: {
      calibration: calibration as Prisma.InputJsonValue,
      ...(current.genesisCompletedAt
        ? {
            genesisCompletedAt: null,
            operationalStatus: "CALIBRANDO",
          }
        : {}),
    },
  });

  const exocortex = current.exocortexName ?? DEFAULT_EXOCORTEX_NAME;
  await appendConduitMessage({
    role: "exocortex",
    content: `Prima Materia fijada: «${title}». El Atanor enciende. ${exocortex} cierra el protocolo de consagración.`,
  });

  const yo = await toDto(updated);
  return maybeCompleteConsecration(yo);
}

export async function patchYo(input: PatchYoInput): Promise<YoDto> {
  const current = await ensureYoShell();

  // Durante misiones: solo telemetría de energía tras Nosce.
  if (current.genesisStatus === "PENDING_MISSIONS") {
    const nosceDone = current.consecration.missions.some(
      (mission) => mission.id === "nosce" && mission.status === "completed",
    );
    if (!nosceDone || input.energyLevel === undefined) {
      throw new Error(
        "Génesis incompleta. Completá las Misiones de Consagración en /yo.",
      );
    }
    if (input.operationalStatus !== undefined || input.calibrationEntry) {
      throw new Error(
        "Durante la consagración solo podés ajustar energía tras Nosce.",
      );
    }
    if (input.mago12 !== undefined || input.mago3 !== undefined) {
      throw new Error(
        "Durante la consagración no podés ajustar el reloj Magos.",
      );
    }

    const updated = await prisma.yo.update({
      where: { id: YO_CORE_ID },
      data: { energyLevel: input.energyLevel },
    });
    return toDto(updated);
  }

  if (!current.genesisCompleted) {
    throw new Error(
      "Génesis incompleta. Completá las Misiones de Consagración en /yo.",
    );
  }

  const calibration = { ...current.calibration };
  if (input.calibrationEntry) {
    calibration[input.calibrationEntry.promptId] =
      input.calibrationEntry.answer.trim();
  }

  const updated = await prisma.yo.update({
    where: { id: YO_CORE_ID },
    data: {
      ...(input.operationalStatus !== undefined
        ? { operationalStatus: input.operationalStatus }
        : {}),
      ...(input.energyLevel !== undefined
        ? { energyLevel: input.energyLevel }
        : {}),
      ...(input.mago12 !== undefined ? { mago12: input.mago12 } : {}),
      ...(input.mago3 !== undefined ? { mago3: input.mago3 } : {}),
      ...(input.calibrationEntry
        ? { calibration: calibration as Prisma.InputJsonValue }
        : {}),
    },
  });

  return toDto(updated);
}

/** Actualiza el reloj operativo Mago12 / Mago3 (post-génesis). */
export async function setOperationalClock(
  input: OperationalClockInput,
): Promise<YoDto> {
  const current = await ensureYoShell();
  if (!current.genesisCompleted) {
    throw new Error(
      "Génesis incompleta. Completá las Misiones de Consagración en /yo.",
    );
  }

  const updated = await prisma.yo.update({
    where: { id: YO_CORE_ID },
    data: {
      ...(input.mago12 !== undefined ? { mago12: input.mago12 } : {}),
      ...(input.mago3 !== undefined ? { mago3: input.mago3 } : {}),
    },
  });

  return toDto(updated);
}

/** Tras un avance de misión, sella génesis si las 3 están completas. */
export async function maybeCompleteConsecration(
  yo?: YoDto,
): Promise<YoDto> {
  const current = yo ?? (await ensureYoShell());
  if (current.genesisStatus === "COMPLETED") return current;
  if (current.genesisStatus === "PENDING_NAMES") return current;
  if (!current.consecration.allComplete) return current;

  const operator = resolveOperatorDisplayName(current.operatorName);
  const exocortex = resolveExocortexDisplayName(current.exocortexName);

  const updated = await prisma.yo.update({
    where: { id: YO_CORE_ID },
    data: {
      genesisCompletedAt: new Date(),
      operationalStatus: "OPERATIVO",
    },
  });

  await appendConduitMessage({
    role: "exocortex",
    content: `Soporte vital estabilizado. ${exocortex} completamente operativo. Bienvenido a la Legión, ${operator}.`,
  });

  await appendConduitMessage({
    role: "system",
    content: `[SELLADO] Protocolo Génesis cerrado. Navegación superior liberada. ${exocortex} asume calibración continua.`,
  });

  return toDto(updated);
}

export async function refreshConsecration(): Promise<YoDto> {
  const yo = await ensureYoShell();
  return maybeCompleteConsecration(yo);
}

export async function seedMissionBoardIntro(): Promise<void> {
  const yo = await ensureYoShell();
  if (yo.genesisStatus !== "PENDING_MISSIONS") return;

  const existing = await prisma.yoConduitMessage.count({
    where: { yoId: YO_CORE_ID },
  });
  if (existing > 0) return;

  const exocortex = resolveExocortexDisplayName(yo.exocortexName);
  const operator = resolveOperatorDisplayName(yo.operatorName);

  await appendConduitMessage({
    role: "exocortex",
    content: `${operator}. Identidades ancladas. Antes de liberar a ${exocortex}, el Senado exige tres actos de consagración. Consultá la Tabula.`,
  });
  await appendConduitMessage({
    role: "exocortex",
    content: `Misión I activa: Nosce Te Ipsum. Abrí la columna de la Tabula. ${exocortex} extraerá tu ADN operativo.`,
  });
}

export async function listConduitMessages(
  limit = 80,
): Promise<YoConduitMessageDto[]> {
  await ensureYoShell();
  const rows = await prisma.yoConduitMessage.findMany({
    where: { yoId: YO_CORE_ID },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    role: row.role as YoConduitMessageDto["role"],
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function appendConduitMessage(input: {
  role: YoConduitMessageDto["role"];
  content: string;
}): Promise<YoConduitMessageDto> {
  await ensureYoShell();
  const row = await prisma.yoConduitMessage.create({
    data: {
      yoId: YO_CORE_ID,
      role: input.role,
      content: input.content.trim(),
    },
  });

  return {
    id: row.id,
    role: row.role as YoConduitMessageDto["role"],
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Compat: displayName del Operador o null si génesis incompleta. */
export async function getOperatorDisplayName(): Promise<string | null> {
  const yo = await ensureYoShell();
  return yo.operatorName?.trim() || null;
}
