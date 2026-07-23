"use server";

import { resolveAutonomousExocortexName } from "@/lib/yo/exocortex-name";
import { runConduitTurn } from "@/lib/yo/conduit";
import {
  baptizeExocortex,
  baptizeOperator,
  ensureYoShell,
  listConduitMessages,
  patchYo,
} from "@/lib/yo/store";
import {
  baptizeExocortexSchema,
  baptizeOperatorSchema,
  conduitMessageSchema,
  patchYoSchema,
  type YoConduitMessageDto,
  type YoDto,
} from "@/lib/yo/types";
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
    if (provided) {
      const yo = await baptizeExocortex({
        exocortexName: provided,
        namedBy: "operator",
      });
      return {
        ok: true,
        data: { yo, resolvedName: provided, namedBy: "operator" },
      };
    }

    const autonomous = await resolveAutonomousExocortexName(shell.operatorName);
    const yo = await baptizeExocortex({
      exocortexName: autonomous.name,
      namedBy: "autonomous",
    });

    return {
      ok: true,
      data: {
        yo,
        resolvedName: autonomous.name,
        namedBy: "autonomous",
      },
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
    const messages = await listConduitMessages();
    return { ok: true, data: { messages } };
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
