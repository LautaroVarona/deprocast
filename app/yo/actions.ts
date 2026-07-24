"use server";

import {
  ensureMissionIPromptEmitted,
  runConduitTurn,
} from "@/lib/yo/conduit";
import {
  baptizeExocortex,
  baptizeOperator,
  ensureYoShell,
  listConduitMessages,
  patchYo,
  refreshConsecration,
  saveNosceMissionAnswers,
  seedMissionBoardIntro,
} from "@/lib/yo/store";
import {
  DEFAULT_EXOCORTEX_NAME,
  NOSCE_BINARY_OPTIONS,
  NOSCE_PRIMA_MATERIA_CHIPS,
  baptizeExocortexSchema,
  baptizeOperatorSchema,
  conduitMessageSchema,
  patchYoSchema,
  type YoConduitMessageDto,
  type YoDto,
} from "@/lib/yo/types";
import { z } from "zod";
import { ensureRuntimeReady } from "@/lib/runtime-setup";

export type YoActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function ready() {
  await ensureRuntimeReady();
}

export async function getYoAction(): Promise<YoActionResult<YoDto>> {
  try {
    await ready();
    const yo = await ensureYoShell();
    return { ok: true, data: yo };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "No se pudo leer el nodo Yo.",
    };
  }
}

export async function baptizeOperatorAction(
  operatorName: string,
): Promise<YoActionResult<YoDto>> {
  try {
    await ready();
    const parsed = baptizeOperatorSchema.safeParse({ operatorName });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Nombre inválido.",
      };
    }
    const yo = await baptizeOperator(parsed.data.operatorName);
    return { ok: true, data: yo };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo bautizar al Operador.",
    };
  }
}

export async function baptizeExocortexAction(
  exocortexName: string | null,
): Promise<
  YoActionResult<{
    yo: YoDto;
    resolvedName: string;
    namedBy: "operator" | "autonomous";
  }>
> {
  try {
    await ready();
    const parsed = baptizeExocortexSchema.safeParse({ exocortexName });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Identificador inválido.",
      };
    }

    const shell = await ensureYoShell();
    if (!shell.operatorName?.trim()) {
      return { ok: false, error: "Primero identificá al Operador." };
    }

    const provided = parsed.data.exocortexName;
    const namedBy = provided ? ("operator" as const) : ("autonomous" as const);
    const resolvedName = provided ?? DEFAULT_EXOCORTEX_NAME;

    const yo = await baptizeExocortex({
      exocortexName: resolvedName,
      namedBy,
    });

    if (yo.genesisStatus === "PENDING_MISSIONS") {
      await seedMissionBoardIntro();
      await ensureMissionIPromptEmitted();
    }

    return {
      ok: true,
      data: { yo, resolvedName, namedBy },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo bautizar al Exocórtex.",
    };
  }
}

export async function patchYoAction(
  input: unknown,
): Promise<YoActionResult<YoDto>> {
  try {
    await ready();
    const parsed = patchYoSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      };
    }
    const yo = await patchYo(parsed.data);
    return { ok: true, data: yo };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el nodo Yo.",
    };
  }
}

export async function refreshConsecrationAction(): Promise<
  YoActionResult<YoDto>
> {
  try {
    await ready();
    const yo = await refreshConsecration();
    if (yo.genesisStatus === "PENDING_MISSIONS") {
      await ensureMissionIPromptEmitted();
    }
    return { ok: true, data: yo };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la Tabula.",
    };
  }
}

export async function prepareMissionBoardAction(): Promise<
  YoActionResult<YoDto>
> {
  try {
    await ready();
    await seedMissionBoardIntro();
    const yo = await refreshConsecration();
    return { ok: true, data: yo };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo preparar la Tabula.",
    };
  }
}

const nosceMissionSchema = z.object({
  exoesqueleto: z.enum(NOSCE_BINARY_OPTIONS),
  primaMateria: z
    .array(z.enum(NOSCE_PRIMA_MATERIA_CHIPS))
    .min(1, "Seleccioná al menos un tipo de Prima Materia."),
  esperanza: z
    .string()
    .trim()
    .min(1, "Escribí qué esperás de Deprocast.")
    .max(2000, "Máximo 2000 caracteres."),
});

export async function completeNosceMissionAction(input: {
  exoesqueleto: string;
  primaMateria: string[];
  esperanza: string;
}): Promise<YoActionResult<YoDto>> {
  try {
    await ready();
    const parsed = nosceMissionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Respuestas inválidas.",
      };
    }

    const yo = await saveNosceMissionAnswers({
      exoesqueleto: parsed.data.exoesqueleto,
      primaMateria: parsed.data.primaMateria.join(" · "),
      esperanza: parsed.data.esperanza,
    });
    return { ok: true, data: yo };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo sellar Nosce Te Ipsum.",
    };
  }
}

export async function listConduitAction(): Promise<
  YoActionResult<YoConduitMessageDto[]>
> {
  try {
    await ready();
    const messages = await listConduitMessages();
    return { ok: true, data: messages };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar el Conducto.",
    };
  }
}

export async function sendConduitAction(
  content: string,
): Promise<
  YoActionResult<{
    messages: YoConduitMessageDto[];
    yo: YoDto;
  }>
> {
  try {
    await ready();
    const parsed = conduitMessageSchema.safeParse({ content });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Mensaje vacío.",
      };
    }
    await runConduitTurn(parsed.data.content);
    const [messages, yo] = await Promise.all([
      listConduitMessages(),
      ensureYoShell(),
    ]);
    return { ok: true, data: { messages, yo } };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Fallo en el Conducto.",
    };
  }
}
