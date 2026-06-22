import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  ChatMessageDto,
  ChatSegment,
  ChatSessionSummary,
  ResolvedMention,
} from "@/lib/chat/types";
import { parseContentDisplay } from "@/lib/chat/format";

function toMessageDto(message: {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  contentDisplay: string | null;
  injectedContext: string | null;
  model: string | null;
  createdAt: Date;
  contextRelations: {
    id: string;
    entityType: string;
    entityId: string;
    entityLabel: string;
    createdAt: Date;
  }[];
}): ChatMessageDto {
  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role as ChatMessageDto["role"],
    content: message.content,
    contentDisplay: parseContentDisplay(message.contentDisplay),
    injectedContext: message.injectedContext,
    model: message.model,
    createdAt: message.createdAt.toISOString(),
    contextRelations: message.contextRelations.map((relation) => ({
      id: relation.id,
      entityType: relation.entityType as ChatMessageDto["contextRelations"][number]["entityType"],
      entityId: relation.entityId,
      entityLabel: relation.entityLabel,
      createdAt: relation.createdAt.toISOString(),
    })),
  };
}

export async function listChatSessions(): Promise<ChatSessionSummary[]> {
  const sessions = await prisma.chatSession.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { messages: true } },
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    messageCount: session._count.messages,
  }));
}

export async function createChatSession(title?: string): Promise<ChatSessionSummary> {
  const session = await prisma.chatSession.create({
    data: { title: title?.trim() || "Nueva conversación" },
    include: { _count: { select: { messages: true } } },
  });

  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    messageCount: session._count.messages,
  };
}

export async function updateChatSessionTitle(
  sessionId: string,
  title: string,
): Promise<ChatSessionSummary | null> {
  const trimmed = title.trim();
  if (!trimmed) return null;

  try {
    const session = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: trimmed },
      include: { _count: { select: { messages: true } } },
    });

    return {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messageCount: session._count.messages,
    };
  } catch {
    return null;
  }
}

export async function deleteChatSession(sessionId: string): Promise<boolean> {
  try {
    await prisma.chatSession.delete({ where: { id: sessionId } });
    return true;
  } catch {
    return false;
  }
}

export async function getChatSession(sessionId: string) {
  return prisma.chatSession.findUnique({ where: { id: sessionId } });
}

export async function listChatMessages(
  sessionId: string,
  limit = 100,
): Promise<ChatMessageDto[]> {
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { contextRelations: true },
  });

  return messages.map(toMessageDto);
}

export async function getRecentChatMessages(
  sessionId: string,
  limit = 20,
): Promise<ChatMessageDto[]> {
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { contextRelations: true },
  });

  return messages.reverse().map(toMessageDto);
}

export async function saveChatExchange(input: {
  sessionId: string;
  userContent: string;
  userDisplay: ChatSegment[];
  mentions: ResolvedMention[];
  assistantContent: string;
  injectedContext: string;
  model: string;
}): Promise<{ userMessage: ChatMessageDto; assistantMessage: ChatMessageDto }> {
  const userMessage = await prisma.chatMessage.create({
    data: {
      sessionId: input.sessionId,
      role: "user",
      content: input.userContent,
      contentDisplay: JSON.stringify(input.userDisplay),
      contextRelations: {
        create: input.mentions.map((mention) => ({
          entityType: mention.entityType,
          entityId: mention.entityId,
          entityLabel: mention.label,
        })),
      },
    },
    include: { contextRelations: true },
  });

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      sessionId: input.sessionId,
      role: "assistant",
      content: input.assistantContent,
      injectedContext: input.injectedContext,
      model: input.model,
    },
    include: { contextRelations: true },
  });

  await prisma.chatSession.update({
    where: { id: input.sessionId },
    data: { updatedAt: new Date() },
  });

  return {
    userMessage: toMessageDto(userMessage),
    assistantMessage: toMessageDto(assistantMessage),
  };
}

export async function countSessionMessages(sessionId: string): Promise<number> {
  return prisma.chatMessage.count({ where: { sessionId } });
}
