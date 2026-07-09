import "server-only";

import {
  buildAutoTitle,
  extractMentions,
  formatHistoryForChat,
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
import { cohereGenerateText, getCohereModelName } from "@/lib/cohere/chat";

const HISTORY_TURNS = 10;

async function generateChatResponse(
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  return cohereGenerateText({
    systemPrompt,
    userContent,
    modelKind: "default",
  });
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
  const history = formatHistoryForChat(
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
    model: getCohereModelName("default"),
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
