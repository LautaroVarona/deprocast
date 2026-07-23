"use server";

import { ensureRuntimeReady } from "@/lib/runtime-setup";
import {
  approveCandidate,
  listPendingCandidates,
  mergeCandidate,
  rejectCandidate,
  searchMergeTargets,
} from "@/lib/triage/store";
import type {
  EntityCandidateDto,
  EntityCandidateType,
  TriageMergeTarget,
} from "@/lib/triage/types";

export type TriageActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function ready() {
  await ensureRuntimeReady();
}

export async function listPendingCandidatesAction(): Promise<
  TriageActionResult<EntityCandidateDto[]>
> {
  try {
    await ready();
    const data = await listPendingCandidates();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar la cola de candidatas.",
    };
  }
}

export async function rejectCandidateAction(
  id: string,
): Promise<TriageActionResult<EntityCandidateDto>> {
  try {
    await ready();
    const data = await rejectCandidate(id);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo descartar la candidata.",
    };
  }
}

export async function approveCandidateAction(
  id: string,
): Promise<TriageActionResult<EntityCandidateDto>> {
  try {
    await ready();
    const data = await approveCandidate(id);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo aprobar la candidata.",
    };
  }
}

export async function mergeCandidateAction(
  id: string,
  targetNodeId: string,
): Promise<TriageActionResult<EntityCandidateDto>> {
  try {
    await ready();
    const data = await mergeCandidate(id, targetNodeId);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo vincular la candidata.",
    };
  }
}

export async function searchMergeTargetsAction(input: {
  type: EntityCandidateType;
  q: string;
}): Promise<TriageActionResult<TriageMergeTarget[]>> {
  try {
    await ready();
    const data = await searchMergeTargets(input);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo buscar entidades.",
    };
  }
}
