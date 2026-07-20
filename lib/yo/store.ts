import "server-only";

import { prisma } from "@/lib/prisma";
import {
  OPERATOR_PROFILE_ID,
  type CalibrationMap,
  type OperatorProfileDto,
  type PatchOperatorProfileInput,
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

function toDto(row: {
  id: string;
  displayName: string;
  operationalStatus: string;
  energyLevel: number;
  calibration: unknown;
  updatedAt: Date;
}): OperatorProfileDto {
  return {
    id: row.id,
    displayName: row.displayName,
    operationalStatus: row.operationalStatus,
    energyLevel: row.energyLevel,
    calibration: parseCalibration(row.calibration),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOrCreateOperatorProfile(): Promise<OperatorProfileDto> {
  const existing = await prisma.operatorProfile.findUnique({
    where: { id: OPERATOR_PROFILE_ID },
  });

  if (existing) {
    return toDto(existing);
  }

  const created = await prisma.operatorProfile.create({
    data: {
      id: OPERATOR_PROFILE_ID,
      displayName: "Lautaro",
      operationalStatus: "OPERATIVO",
      energyLevel: 6,
      calibration: {} as Prisma.InputJsonValue,
    },
  });

  return toDto(created);
}

export async function patchOperatorProfile(
  input: PatchOperatorProfileInput,
): Promise<OperatorProfileDto> {
  const current = await getOrCreateOperatorProfile();
  const calibration = { ...current.calibration };

  if (input.calibrationEntry) {
    calibration[input.calibrationEntry.promptId] =
      input.calibrationEntry.answer.trim();
  }

  const updated = await prisma.operatorProfile.update({
    where: { id: OPERATOR_PROFILE_ID },
    data: {
      ...(input.displayName !== undefined
        ? { displayName: input.displayName }
        : {}),
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
