import { listLaboralChallenges } from "@/lib/laboral/challenges";
import { listProjects } from "@/lib/projects/service";
import type {
  CalibratorQueueConfig,
  CardSourceAdapter,
  VibeCalibrationCard,
} from "../types";

function matchesCampo(
  campoSlug: string | undefined,
  itemCampo: string,
): boolean {
  if (!campoSlug) return true;
  return itemCampo === campoSlug;
}

async function fetchValidatedCards(
  config: CalibratorQueueConfig,
): Promise<VibeCalibrationCard[]> {
  const cards: VibeCalibrationCard[] = [];

  const [challenges, projects] = await Promise.all([
    listLaboralChallenges(),
    listProjects(),
  ]);

  for (const challenge of challenges) {
    if (!matchesCampo(config.campoSlug, "laboral_varona")) continue;

    cards.push({
      id: `validated:laboral:${challenge.id}`,
      title: challenge.title,
      description:
        challenge.observaciones?.trim() ||
        `Reto laboral · ${challenge.onda} · responsable ${challenge.responsable}`,
      source: "validated",
      sourceRef: challenge.filename,
      metadata: {
        kind: "laboral_challenge",
        onda: challenge.onda,
        responsable: challenge.responsable,
        prioridad: challenge.prioridad,
        impacto: challenge.impacto,
        dificultad: challenge.dificultad,
        baseWeight: challenge.baseWeight,
        campoSlug: "laboral_varona",
      },
    });
  }

  for (const project of projects) {
    if (!matchesCampo(config.campoSlug, project.campoSlug)) continue;

    cards.push({
      id: `validated:project:${project.id}`,
      title: project.title,
      description:
        project.description?.trim() ||
        `Proyecto · ${project.campo} · ${project.estado}`,
      source: "validated",
      sourceRef: project.filename,
      metadata: {
        kind: "project",
        campoSlug: project.campoSlug,
        campo: project.campo,
        prioridad: project.prioridad,
        impacto: project.impacto,
        dificultad: project.dificultad,
        estado: project.estado,
        responsable: project.responsable,
      },
    });
  }

  return cards;
}

export const validatedAdapter: CardSourceAdapter = {
  source: "validated",
  fetchCards: fetchValidatedCards,
};
