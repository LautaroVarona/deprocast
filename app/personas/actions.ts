"use server";

import { createPersonaWithRelations } from "@/lib/personas/create-with-relations";
import type {
  CreatePersonaWithRelationsPayload,
  Persona,
  PersonaConnectionDraft,
} from "@/lib/personas/model";
import { ensureRuntimeReady } from "@/lib/runtime-setup";

export type PersonaActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function parseConnections(raw: unknown): PersonaConnectionDraft[] {
  if (!Array.isArray(raw)) return [];

  const result: PersonaConnectionDraft[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const targetKind = row.targetKind;
    if (targetKind !== "persona" && targetKind !== "proyecto") continue;
    if (typeof row.targetId !== "string" || !row.targetId.trim()) continue;
    if (
      typeof row.relationContext !== "string" ||
      !row.relationContext.trim()
    ) {
      continue;
    }

    result.push({
      targetId: row.targetId.trim(),
      targetKind,
      targetLabel:
        typeof row.targetLabel === "string" ? row.targetLabel.trim() : "",
      relationContext: row.relationContext.trim(),
      relationType:
        typeof row.relationType === "string"
          ? row.relationType.trim()
          : undefined,
      strength: typeof row.strength === "number" ? row.strength : undefined,
    });
  }

  return result;
}

export async function createPersonaAction(
  input: CreatePersonaWithRelationsPayload,
): Promise<PersonaActionResult<Persona>> {
  try {
    await ensureRuntimeReady();

    const nombrePrincipal = String(input.nombrePrincipal ?? "").trim();
    if (!nombrePrincipal) {
      return { ok: false, error: "El nombre es obligatorio." };
    }

    const aliases = Array.isArray(input.aliases)
      ? input.aliases
          .filter((alias): alias is string => typeof alias === "string")
          .map((alias) => alias.trim())
          .filter(Boolean)
      : [];

    const connections = parseConnections(input.connections);
    const missingContext = connections.find(
      (connection) => !connection.relationContext.trim(),
    );
    if (missingContext) {
      return {
        ok: false,
        error: `Indicá el contexto del vínculo con ${missingContext.targetLabel || "la entidad"}.`,
      };
    }

    const persona = await createPersonaWithRelations({
      nombrePrincipal,
      aliases,
      notasGenerales:
        typeof input.notasGenerales === "string" ? input.notasGenerales : "",
      connections,
    });

    return { ok: true, data: persona };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo crear la persona.",
    };
  }
}
