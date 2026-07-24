import "server-only";

import { prisma } from "@/lib/prisma";
import {
  CONSECRATION_MISSION_I_PROMPTS,
  CONSECRATION_PERSONA_TARGET,
  CONSECRATION_PROJECT_TARGET,
  type CalibrationMap,
  type ConsecrationMissionId,
  type ConsecrationMissionState,
  type ConsecrationProgress,
  type GenesisStatus,
  type MissionRuntimeStatus,
} from "@/lib/yo/types";

export function deriveGenesisStatus(input: {
  operatorName: string | null;
  exocortexName: string | null;
  genesisCompletedAt: Date | string | null;
  calibration?: CalibrationMap;
}): GenesisStatus {
  const hasNames = Boolean(
    input.operatorName?.trim() && input.exocortexName?.trim(),
  );
  if (!hasNames) return "PENDING_NAMES";
  if (input.genesisCompletedAt) {
    // Sellado prematuro / legacy sin ADN de Nosce → reabrir consagración.
    if (input.calibration && !isMissionIComplete(input.calibration)) {
      return "PENDING_MISSIONS";
    }
    return "COMPLETED";
  }
  return "PENDING_MISSIONS";
}

export function countMissionIAnswers(calibration: CalibrationMap): number {
  return CONSECRATION_MISSION_I_PROMPTS.filter((prompt) =>
    Boolean(calibration[prompt.id]?.trim()),
  ).length;
}

export function isMissionIComplete(calibration: CalibrationMap): boolean {
  return countMissionIAnswers(calibration) >= CONSECRATION_MISSION_I_PROMPTS.length;
}

function resolveMissionStatus(input: {
  id: ConsecrationMissionId;
  missionIDone: boolean;
  missionIIDone: boolean;
  missionIIIDone: boolean;
}): MissionRuntimeStatus {
  if (input.id === "nosce") {
    return input.missionIDone ? "completed" : "active";
  }
  if (input.id === "senado") {
    if (input.missionIIDone) return "completed";
    return input.missionIDone ? "active" : "locked";
  }
  if (input.missionIIIDone) return "completed";
  return input.missionIIDone ? "active" : "locked";
}

export async function buildConsecrationProgress(
  calibration: CalibrationMap,
): Promise<ConsecrationProgress> {
  const [personaCount, proposalCount] = await Promise.all([
    prisma.kgNode.count({ where: { type: "persona" } }),
    prisma.projectProposal.count(),
  ]);

  const missionIAnswers = countMissionIAnswers(calibration);
  const missionIDone = missionIAnswers >= CONSECRATION_MISSION_I_PROMPTS.length;
  const missionIIDone = personaCount >= CONSECRATION_PERSONA_TARGET;
  const missionIIIDone = proposalCount >= CONSECRATION_PROJECT_TARGET;

  const missions: ConsecrationMissionState[] = [
    {
      id: "nosce",
      status: resolveMissionStatus({
        id: "nosce",
        missionIDone,
        missionIIDone,
        missionIIIDone,
      }),
      progress: missionIAnswers,
      target: CONSECRATION_MISSION_I_PROMPTS.length,
    },
    {
      id: "senado",
      status: resolveMissionStatus({
        id: "senado",
        missionIDone,
        missionIIDone,
        missionIIIDone,
      }),
      progress: Math.min(personaCount, CONSECRATION_PERSONA_TARGET),
      target: CONSECRATION_PERSONA_TARGET,
    },
    {
      id: "prima",
      status: resolveMissionStatus({
        id: "prima",
        missionIDone,
        missionIIDone,
        missionIIIDone,
      }),
      progress: Math.min(proposalCount, CONSECRATION_PROJECT_TARGET),
      target: CONSECRATION_PROJECT_TARGET,
    },
  ];

  return {
    missions,
    missionIAnswers,
    personaCount,
    projectCount: proposalCount,
    allComplete: missionIDone && missionIIDone && missionIIIDone,
    activeMissionId:
      missions.find((mission) => mission.status === "active")?.id ?? null,
  };
}

export function nextMissionIPrompt(calibration: CalibrationMap) {
  return (
    CONSECRATION_MISSION_I_PROMPTS.find(
      (prompt) => !calibration[prompt.id]?.trim(),
    ) ?? null
  );
}
