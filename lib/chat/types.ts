export const CHAT_ENTITY_TYPES = [
  "proyecto",
  "reto",
  "area",
  "persona",
  "campo",
  "laboral_reto",
] as const;

export type ChatEntityType = (typeof CHAT_ENTITY_TYPES)[number];

export const CHAT_MESSAGE_ROLES = ["user", "assistant"] as const;
export type ChatMessageRole = (typeof CHAT_MESSAGE_ROLES)[number];

export type ChatTextSegment = {
  type: "text";
  value: string;
};

export type ChatMentionSegment = {
  type: "mention";
  entityType: ChatEntityType;
  entityId: string;
  label: string;
};

export type ChatSegment = ChatTextSegment | ChatMentionSegment;

export type MentionSuggestion = {
  entityType: ChatEntityType;
  entityId: string;
  label: string;
  subtitle?: string;
  score: number;
  category: string;
};

export type ChatSessionSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type ChatContextRelationDto = {
  id: string;
  entityType: ChatEntityType;
  entityId: string;
  entityLabel: string;
  createdAt: string;
};

export type ChatMessageDto = {
  id: string;
  sessionId: string;
  role: ChatMessageRole;
  content: string;
  contentDisplay: ChatSegment[] | null;
  injectedContext: string | null;
  model: string | null;
  createdAt: string;
  contextRelations: ChatContextRelationDto[];
};

export type SendChatInput = {
  sessionId: string;
  segments: ChatSegment[];
};

import type { ContextEventDto } from "@/lib/events/types";

export type ChatTurnResult = {
  userMessage: ChatMessageDto;
  assistantMessage: ChatMessageDto;
  proposals: ContextEventDto[];
};

export type ContextBlock = {
  title: string;
  body: string;
  priority: number;
};

export type ResolvedMention = {
  entityType: ChatEntityType;
  entityId: string;
  label: string;
};

export function isChatEntityType(value: unknown): value is ChatEntityType {
  return (
    typeof value === "string" &&
    CHAT_ENTITY_TYPES.includes(value as ChatEntityType)
  );
}

export function isChatMessageRole(value: unknown): value is ChatMessageRole {
  return (
    typeof value === "string" &&
    CHAT_MESSAGE_ROLES.includes(value as ChatMessageRole)
  );
}
