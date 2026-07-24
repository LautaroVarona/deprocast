import "server-only";

import { countOperatorLinkedPersonas } from "@/lib/yo/senado-graph";
import {
  CONSECRATION_MISSION_I_PROMPTS,
  CONSECRATION_MISSION_III_KEY,
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
    // Sellado prematuro / incompleto → seguir en Tabula hasta Nosce + Prima.
    if (
      !input.calibration ||
      !isMissionIComplete(input.calibration) ||
      !isMissionIIIComplete(input.calibration)
    ) {
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

export function isMissionIIIComplete(calibration: CalibrationMap): boolean {
  return Boolean(calibration[CONSECRATION_MISSION_III_KEY]?.trim());
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
  const personaCount = await countOperatorLinkedPersonas();
  const missionIAnswers = countMissionIAnswers(calibration);
  const missionIDone = missionIAnswers >= CONSECRATION_MISSION_I_PROMPTS.length;
  const missionIIDone = personaCount >= CONSECRATION_PERSONA_TARGET;
  const missionIIIDone = isMissionIIIComplete(calibration);
  const projectCount = missionIIIDone ? CONSECRATION_PROJECT_TARGET : 0;

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
      progress: projectCount,
      target: CONSECRATION_PROJECT_TARGET,
    },
  ];

  return {
    missions,
    missionIAnswers,
    personaCount,
    projectCount,
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
