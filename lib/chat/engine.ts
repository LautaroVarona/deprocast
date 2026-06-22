import "server-only";

import {
  buildAutoTitle,
  extractMentions,
  formatHistoryForGemini,
  mergeDraftIntoSegments,
  segmentsToPlainText,
} from "@/lib/chat/format";
import { buildChatContext } from "@/lib/chat/context-retriever";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat/prompts";
import {
  countSessionMessages,
  getRecentChatMessages,
  saveChatExchange,
  updateChatSessionTitle,
} from "@/lib/chat/service";
import type { ChatSegment, SendChatInput, ChatTurnResult } from "@/lib/chat/types";
import { processChatForEvents } from "@/lib/events/process";
import {
  extractVertexText,
  getVertexGenerativeModel,
  getVertexModelName,
} from "@/lib/vertex-gemini/client";
import {
  isRetryableVertexError,
  VertexGeminiError,
} from "@/lib/vertex-gemini/errors";

const HISTORY_TURNS = 10;
const MAX_RETRIES = 5;

function stripMarkdownFences(text: string): string {
  const fenced = text.match(/^```(?:\w+)?\s*([\s\S]*?)```\s*$/);
  return fenced ? fenced[1].trim() : text.trim();
}

async function withVertexRetry<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableVertexError(error) || attempt === MAX_RETRIES) {
        break;
      }
      const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : `${label} falló tras ${MAX_RETRIES} intentos.`;
  throw new VertexGeminiError(message);
}

async function generateChatResponse(
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  const model = getVertexGenerativeModel(systemPrompt);
  const result = await withVertexRetry("Chat generateContent", () =>
    model.generateContent({
      contents: [{ role: "user", parts: [{ text: userContent }] }],
    }),
  );
  return stripMarkdownFences(extractVertexText(result));
}

export async function runChatTurn(input: SendChatInput): Promise<ChatTurnResult> {
  const segments: ChatSegment[] = input.segments.filter(
    (segment) => segment.type !== "text" || segment.value.trim().length > 0,
  );

  const plainText = segmentsToPlainText(segments);
  if (!plainText) {
    throw new Error("El mensaje no puede estar vacío.");
  }

  const mentions = extractMentions(segments);
  const contextBlock = await buildChatContext(mentions, plainText);
  const systemPrompt = `${CHAT_SYSTEM_PROMPT}\n\n## Contexto Relevante\n${contextBlock}`;

  const recentMessages = await getRecentChatMessages(
    input.sessionId,
    HISTORY_TURNS * 2,
  );
  const history = formatHistoryForGemini(
    recentMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  );

  const userMessage = history
    ? `${history}\n\nUsuario: ${plainText}`
    : plainText;

  const assistantContent = await generateChatResponse(
    systemPrompt,
    userMessage,
  );

  const previousCount = await countSessionMessages(input.sessionId);
  const { userMessage: savedUser, assistantMessage } = await saveChatExchange({
    sessionId: input.sessionId,
    userContent: plainText,
    userDisplay: segments,
    mentions,
    assistantContent,
    injectedContext: contextBlock,
    model: getVertexModelName(),
  });

  if (previousCount === 0) {
    await updateChatSessionTitle(
      input.sessionId,
      buildAutoTitle(plainText),
    );
  }

  let proposals: ChatTurnResult["proposals"] = [];
  try {
    proposals = await processChatForEvents({
      messageId: savedUser.id,
      userContent: plainText,
      assistantContent,
      occurredAt: new Date(savedUser.createdAt),
      mentions: mentions.map((m) => ({
        entityType: m.entityType,
        entityId: m.entityId,
        label: m.label,
      })),
    });
  } catch (error) {
    console.error("Chat event extraction error:", error);
  }

  return {
    userMessage: savedUser,
    assistantMessage,
    proposals,
  };
}

export function normalizeSendInput(body: unknown): SendChatInput | null {
  if (!body || typeof body !== "object") return null;
  const payload = body as Record<string, unknown>;
  if (typeof payload.sessionId !== "string" || !payload.sessionId.trim()) {
    return null;
  }
  if (!Array.isArray(payload.segments)) return null;

  const segments = payload.segments.filter(
    (segment): segment is ChatSegment =>
      !!segment &&
      typeof segment === "object" &&
      (segment as ChatSegment).type === "text"
        ? typeof (segment as { value?: unknown }).value === "string"
        : (segment as ChatSegment).type === "mention" &&
          typeof (segment as { entityType?: unknown }).entityType ===
            "string" &&
          typeof (segment as { entityId?: unknown }).entityId === "string" &&
          typeof (segment as { label?: unknown }).label === "string",
  );

  return {
    sessionId: payload.sessionId.trim(),
    segments,
  };
}

export function normalizeSegmentsFromDraft(
  segments: ChatSegment[],
  draftText: string,
): ChatSegment[] {
  return mergeDraftIntoSegments(segments, draftText).filter(
    (segment) => segment.type !== "text" || segment.value.trim().length > 0,
  );
}
