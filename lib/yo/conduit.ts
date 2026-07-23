import "server-only";

import { cohereGenerateText, getCohereModelName } from "@/lib/cohere/chat";
import { YO_CONDUIT_SYSTEM_PROMPT } from "@/lib/yo/prompts";
import {
  appendConduitMessage,
  ensureYoShell,
  listConduitMessages,
} from "@/lib/yo/store";
import { CALIBRATION_PROMPTS } from "@/lib/yo/types";

function formatCalibrationBlock(
  calibration: Record<string, string>,
): string {
  const lines = CALIBRATION_PROMPTS.filter(
    (prompt) => calibration[prompt.id],
  ).map((prompt) => `- ${prompt.question} → ${calibration[prompt.id]}`);
  return lines.join("\n");
}

export async function runConduitTurn(content: string): Promise<{
  operatorMessage: Awaited<ReturnType<typeof appendConduitMessage>>;
  exocortexMessage: Awaited<ReturnType<typeof appendConduitMessage>>;
}> {
  const yo = await ensureYoShell();
  if (!yo.genesisCompleted || !yo.operatorName || !yo.exocortexName) {
    throw new Error("Conducto bloqueado: génesis incompleta.");
  }

  const operatorMessage = await appendConduitMessage({
    role: "operator",
    content,
  });

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
