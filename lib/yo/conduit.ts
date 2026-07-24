import "server-only";

import { cohereGenerateText, getCohereModelName } from "@/lib/cohere/chat";
import {
  isMissionIComplete,
  nextMissionIPrompt,
} from "@/lib/yo/consecration";
import { YO_CONDUIT_SYSTEM_PROMPT } from "@/lib/yo/prompts";
import {
  appendConduitMessage,
  ensureYoShell,
  listConduitMessages,
  saveCalibrationEntry,
} from "@/lib/yo/store";
import {
  CALIBRATION_PROMPTS,
  CONSECRATION_MISSION_I_PROMPTS,
  CONSECRATION_PERSONA_TARGET,
} from "@/lib/yo/types";

function formatCalibrationBlock(
  calibration: Record<string, string>,
): string {
  const lines = CALIBRATION_PROMPTS.filter(
    (prompt) => calibration[prompt.id],
  ).map((prompt) => `- ${prompt.question} → ${calibration[prompt.id]}`);
  return lines.join("\n");
}

/**
 * Turno del Conducto.
 * Durante Misión I (Nosce), intercepta respuestas y avanza el protocolo
 * sin LLM — Mastropiero guía con guion de consagración.
 */
export async function runConduitTurn(content: string): Promise<{
  operatorMessage: Awaited<ReturnType<typeof appendConduitMessage>>;
  exocortexMessage: Awaited<ReturnType<typeof appendConduitMessage>>;
}> {
  const yo = await ensureYoShell();
  if (yo.genesisStatus === "PENDING_NAMES" || !yo.operatorName || !yo.exocortexName) {
    throw new Error("Conducto bloqueado: bautismo de nombres incompleto.");
  }

  // Misión I: flujo ritual scriptado.
  if (
    yo.genesisStatus === "PENDING_MISSIONS" &&
    yo.consecration.activeMissionId === "nosce"
  ) {
    return runMissionITurn(content);
  }

  const operatorMessage = await appendConduitMessage({
    role: "operator",
    content,
  });

  // Durante misiones II/III el Conducto responde en modo ceremonial breve.
  if (yo.genesisStatus === "PENDING_MISSIONS") {
    const active = yo.consecration.activeMissionId;
    let reply: string;
    if (active === "senado") {
      const remaining = Math.max(
        0,
        CONSECRATION_PERSONA_TARGET - yo.consecration.personaCount,
      );
      reply =
        remaining > 0
          ? `ADN anclado. El Senado espera ${remaining} entidad${remaining === 1 ? "" : "es"} más. Usá el registro superpuesto — no basta con nombrarlas aquí.`
          : "Senado saturado. Activá Prima Materia desde la Tabula.";
    } else if (active === "prima") {
      reply =
        "El Atanor exige fuego tangible. Inyectá tu objetivo a 90 días con el formulario de Prima Materia.";
    } else {
      reply = "Consultá la Tabula de Misiones. El protocolo aún no está sellado.";
    }

    const exocortexMessage = await appendConduitMessage({
      role: "exocortex",
      content: reply,
    });
    return { operatorMessage, exocortexMessage };
  }

  const history = await listConduitMessages(40);
  const historyBlock = history
    .slice(0, -1)
    .map((message) => {
      const who =
        message.role === "operator"
          ? yo.operatorName
          : message.role === "exocortex"
            ? yo.exocortexName
            : "SYSTEM";
      return `${who}: ${message.content}`;
    })
    .join("\n");

  const systemPrompt = YO_CONDUIT_SYSTEM_PROMPT(
    yo.operatorName,
    yo.exocortexName,
    yo.operationalStatus,
    yo.energyLevel,
    formatCalibrationBlock(yo.calibration),
  );

  const userContent = historyBlock
    ? `${historyBlock}\n${yo.operatorName}: ${content}`
    : content;

  let reply: string;
  try {
    reply = await cohereGenerateText({
      systemPrompt,
      userContent,
      modelKind: "default",
      temperature: 0.35,
      maxTokens: 600,
    });
  } catch (error) {
    console.error("Conduit LLM error:", error);
    reply = `[ALERTA] Enlace cognitivo degradado (${getCohereModelName("default")}). Reintentá el comando.`;
  }

  const exocortexMessage = await appendConduitMessage({
    role: "exocortex",
    content: reply.trim() || "[ACK] Sin respuesta útil.",
  });

  return { operatorMessage, exocortexMessage };
}

async function runMissionITurn(content: string): Promise<{
  operatorMessage: Awaited<ReturnType<typeof appendConduitMessage>>;
  exocortexMessage: Awaited<ReturnType<typeof appendConduitMessage>>;
}> {
  const yoBefore = await ensureYoShell();
  const prompt = nextMissionIPrompt(yoBefore.calibration);
  if (!prompt) {
    const operatorMessage = await appendConduitMessage({
      role: "operator",
      content,
    });
    const exocortexMessage = await appendConduitMessage({
      role: "exocortex",
      content:
        "Nosce Te Ipsum ya está sellado. Activá El Senado desde la Tabula.",
    });
    return { operatorMessage, exocortexMessage };
  }

  const operatorMessage = await appendConduitMessage({
    role: "operator",
    content,
  });

  const yoAfter = await saveCalibrationEntry(prompt.id, content);
  const answered = CONSECRATION_MISSION_I_PROMPTS.filter((item) =>
    Boolean(yoAfter.calibration[item.id]?.trim()),
  ).length;
  const next = nextMissionIPrompt(yoAfter.calibration);

  let reply: string;
  if (isMissionIComplete(yoAfter.calibration) || !next) {
    reply = `Señal ${answered}/${CONSECRATION_MISSION_I_PROMPTS.length} absorbida. ADN personal indexado. Telemetría de energía desbloqueada. Misión I sellada — El Senado espera.`;
  } else {
    reply = `Señal ${answered}/${CONSECRATION_MISSION_I_PROMPTS.length} registrada.\n\n${next.question}`;
  }

  const exocortexMessage = await appendConduitMessage({
    role: "exocortex",
    content: reply,
  });

  return { operatorMessage, exocortexMessage };
}

/** Emite la pregunta activa de Nosce si aún no está en el Conducto. */
export async function ensureMissionIPromptEmitted(): Promise<void> {
  const yo = await ensureYoShell();
  if (yo.genesisStatus !== "PENDING_MISSIONS") return;
  if (yo.consecration.activeMissionId !== "nosce") return;

  const prompt = nextMissionIPrompt(yo.calibration);
  if (!prompt) return;

  const messages = await listConduitMessages(40);
  const alreadyAsked = messages.some(
    (message) =>
      message.role === "exocortex" &&
      message.content.includes(prompt.question),
  );
  if (alreadyAsked) return;

  const index =
    CONSECRATION_MISSION_I_PROMPTS.findIndex((item) => item.id === prompt.id) +
    1;
  await appendConduitMessage({
    role: "exocortex",
    content: `[NOSCE ${index}/${CONSECRATION_MISSION_I_PROMPTS.length}] ${prompt.question}`,
  });
}
