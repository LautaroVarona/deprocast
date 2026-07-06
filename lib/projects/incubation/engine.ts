import "server-only";

import { searchNodes } from "@/lib/kg/queries";
import { listCampos } from "@/lib/projects/service";
import { extractIncubationState } from "@/lib/projects/incubation/extract";
import {
  buildIncubationSystemPrompt,
  INCUBATION_WELCOME_MESSAGE,
} from "@/lib/projects/incubation/prompts";
import { evaluateReadiness } from "@/lib/projects/incubation/readiness";
import type {
  IncubationExtraction,
  IncubationMessage,
} from "@/lib/projects/incubation/schema";
import {
  appendIncubationMessages,
  createIncubationSession,
  getIncubationSession,
  type IncubationSessionDto,
} from "@/lib/projects/incubation/session-store";
import {
  extractVertexText,
  getVertexGenerativeModel,
  getVertexModelName,
} from "@/lib/vertex-gemini/client";
import { withVertexRetry } from "@/lib/vertex-gemini/retry";

const MAX_HISTORY_MESSAGES = 12;

export type IncubationTurnResult = {
  session: IncubationSessionDto;
  assistantMessage: string;
  extractionState: IncubationExtraction;
  readiness: ReturnType<typeof evaluateReadiness>;
  model: string;
};

function stripMarkdownFences(text: string): string {
  const fenced = text.match(/^```(?:\w+)?\s*([\s\S]*?)```\s*$/);
  return fenced ? fenced[1].trim() : text.trim();
}

function formatTranscript(messages: IncubationMessage[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "Usuario" : "Incubador"}: ${m.content}`)
    .join("\n\n");
}

function formatHistoryForPrompt(messages: IncubationMessage[]): string {
  const recent = messages.slice(-MAX_HISTORY_MESSAGES);
  return recent
    .map((m) => `${m.role === "user" ? "Usuario" : "Incubador"}: ${m.content}`)
    .join("\n");
}

async function buildContextBlock(): Promise<{ campos: string; personas: string }> {
  const [campos, personaNodes] = await Promise.all([
    listCampos(),
    searchNodes({ type: "persona", q: "", limit: 20 }),
  ]);

  const camposText =
    campos.length > 0
      ? campos.map((c) => `- ${c.slug}: ${c.label}`).join("\n")
      : "- babel: Babel (default)";

  const personasText =
    personaNodes.length > 0
      ? personaNodes.map((p) => `- ${p.primaryName}`).join("\n")
      : "(ninguna registrada aún)";

  return { campos: camposText, personas: personasText };
}

async function generateAssistantReply(
  extraction: IncubationExtraction,
  messages: IncubationMessage[],
  userMessage: string,
): Promise<string> {
  const context = await buildContextBlock();
  const systemPrompt = buildIncubationSystemPrompt(extraction, context);
  const history = formatHistoryForPrompt(messages);

  const userContent = history
    ? `${history}\n\nUsuario: ${userMessage}`
    : userMessage;

  const model = getVertexGenerativeModel(systemPrompt);
  const result = await withVertexRetry("Incubation chat", () =>
    model.generateContent({
      contents: [{ role: "user", parts: [{ text: userContent }] }],
    }),
  );

  return stripMarkdownFences(extractVertexText(result));
}

export async function createIncubationSessionWithWelcome(): Promise<IncubationSessionDto> {
  const welcome: IncubationMessage = {
    role: "assistant",
    content: INCUBATION_WELCOME_MESSAGE,
    createdAt: new Date().toISOString(),
  };
  return createIncubationSession([welcome]);
}

export async function runIncubationTurn(
  sessionId: string,
  userMessage: string,
): Promise<IncubationTurnResult> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    throw new Error("El mensaje no puede estar vacío.");
  }

  const session = await getIncubationSession(sessionId);
  if (!session) {
    throw new Error("Sesión de incubación no encontrada.");
  }
  if (session.status !== "active") {
    throw new Error("La sesión ya no está activa.");
  }

  const assistantContent = await generateAssistantReply(
    session.extractionState,
    session.messages,
    trimmed,
  );

  const now = new Date().toISOString();
  const newMessages: IncubationMessage[] = [
    { role: "user", content: trimmed, createdAt: now },
    { role: "assistant", content: assistantContent, createdAt: now },
  ];

  const allMessages = [...session.messages, ...newMessages];
  const transcript = formatTranscript(allMessages);
  const extractionState = await extractIncubationState(
    transcript,
    session.extractionState,
  );

  const updated = await appendIncubationMessages(
    sessionId,
    newMessages,
    extractionState,
  );

  return {
    session: updated,
    assistantMessage: assistantContent,
    extractionState,
    readiness: evaluateReadiness(extractionState),
    model: getVertexModelName(),
  };
}
