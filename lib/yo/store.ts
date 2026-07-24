import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildConsecrationProgress,
  deriveGenesisStatus,
} from "@/lib/yo/consecration";
import {
  DEFAULT_EXOCORTEX_NAME,
  YO_CORE_ID,
  type CalibrationMap,
  type ExocortexNamedBy,
  type PatchYoInput,
  type YoConduitMessageDto,
  type YoDto,
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

async function toDto(row: {
  id: string;
  operatorName: string | null;
  exocortexName: string | null;
  exocortexNamedBy: string | null;
  operationalStatus: string;
  energyLevel: number;
  calibration: unknown;
  genesisCompletedAt: Date | null;
  updatedAt: Date;
}): Promise<YoDto> {
  const calibration = parseCalibration(row.calibration);
  const genesisStatus = deriveGenesisStatus(row);
  const consecration = await buildConsecrationProgress(calibration);

  return {
    id: row.id,
    operatorName: row.operatorName,
    exocortexName: row.exocortexName,
    exocortexNamedBy: parseNamedBy(row.exocortexNamedBy),
    operationalStatus: row.operationalStatus,
    energyLevel: row.energyLevel,
    calibration,
    genesisStatus,
    genesisCompleted: genesisStatus === "COMPLETED",
    genesisCompletedAt: row.genesisCompletedAt?.toISOString() ?? null,
    consecration,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensureYoShell(): Promise<YoDto> {
  const existing = await prisma.yo.findUnique({ where: { id: YO_CORE_ID } });
  if (existing) return toDto(existing);

  const created = await prisma.yo.create({
    data: {
      id: YO_CORE_ID,
      operationalStatus: "STANDBY",
      energyLevel: 5,
      calibration: {} as Prisma.InputJsonValue,
    },
  });

  return toDto(created);
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
    throw new Error("Primero debe bautizarse el Operador.");
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
  if (current.genesisStatus !== "PENDING_MISSIONS") {
    throw new Error("Nosce solo puede sellarse durante las Misiones de Consagración.");
  }
  if (current.consecration.activeMissionId !== "nosce") {
    throw new Error("Nosce Te Ipsum ya está sellado o no está activa.");
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
      ...(input.calibrationEntry
        ? { calibration: calibration as Prisma.InputJsonValue }
        : {}),
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

  const operator = current.operatorName?.trim() || "Operador";
  const exocortex = current.exocortexName?.trim() || DEFAULT_EXOCORTEX_NAME;

  const updated = await prisma.yo.update({
    where: { id: YO_CORE_ID },
    data: {
      genesisCompletedAt: new Date(),
      operationalStatus: "OPERATIVO",
    },
  });

  await appendConduitMessage({
    role: "exocortex",
    content: `Soporte vital estabilizado. Exocórtex completamente operativo. Bienvenido a la Legión, ${operator}.`,
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

  const exocortex = yo.exocortexName ?? DEFAULT_EXOCORTEX_NAME;
  const operator = yo.operatorName ?? "Operador";

  await appendConduitMessage({
    role: "exocortex",
    content: `${operator}. Identidades ancladas. Antes de liberar el exoesqueleto, el Senado exige tres actos de consagración. Consultá la Tabula.`,
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
