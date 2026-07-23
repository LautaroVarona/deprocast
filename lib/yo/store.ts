import "server-only";

import { prisma } from "@/lib/prisma";
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

function isGenesisComplete(row: {
  operatorName: string | null;
  exocortexName: string | null;
  genesisCompletedAt: Date | null;
}): boolean {
  return Boolean(
    row.operatorName?.trim() &&
      row.exocortexName?.trim() &&
      row.genesisCompletedAt,
  );
}

function toDto(row: {
  id: string;
  operatorName: string | null;
  exocortexName: string | null;
  exocortexNamedBy: string | null;
  operationalStatus: string;
  energyLevel: number;
  calibration: unknown;
  genesisCompletedAt: Date | null;
  updatedAt: Date;
}): YoDto {
  return {
    id: row.id,
    operatorName: row.operatorName,
    exocortexName: row.exocortexName,
    exocortexNamedBy: parseNamedBy(row.exocortexNamedBy),
    operationalStatus: row.operationalStatus,
    energyLevel: row.energyLevel,
    calibration: parseCalibration(row.calibration),
    genesisCompleted: isGenesisComplete(row),
    genesisCompletedAt: row.genesisCompletedAt?.toISOString() ?? null,
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
  return toDto(updated);
}

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
      operationalStatus: "OPERATIVO",
      genesisCompletedAt: new Date(),
    },
  });

  return toDto(updated);
}

export async function patchYo(input: PatchYoInput): Promise<YoDto> {
  const current = await ensureYoShell();
  if (!current.genesisCompleted) {
    throw new Error("Génesis incompleta. Completá el bautismo en /yo.");
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
