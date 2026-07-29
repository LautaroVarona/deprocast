"use server";

import { prisma } from "@/lib/prisma";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { generateThreadReply } from "@/lib/jornada/chat-engine";
import { distillDailySession } from "@/lib/jornada/destilador";

type ActionOk<T> = { ok: true; data: T };
type ActionErr = { ok: false; error: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Session ──────────────────────────────────────────────────────────

export type DailySessionFull = Awaited<ReturnType<typeof loadSession>>;

async function loadSession(date: string) {
  return prisma.dailySession.findUnique({
    where: { date },
    include: {
      threads: {
        orderBy: { createdAt: "asc" },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          contexts: true,
        },
      },
    },
  });
}

export async function getOrCreateTodaySession(): Promise<
  ActionResult<NonNullable<DailySessionFull>>
> {
  try {
    await ensureRuntimeReady();
    const date = today();
    let session = await loadSession(date);

    if (!session) {
      await prisma.dailySession.create({ data: { date } });
      session = await loadSession(date);
    }

    return { ok: true, data: session! };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error al cargar sesión.",
    };
  }
}

// ── Threads ──────────────────────────────────────────────────────────

export async function createNewThread(
  sessionId: string,
  title: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await ensureRuntimeReady();

    const session = await prisma.dailySession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    if (session.isClosed) {
      return { ok: false, error: "La jornada ya está cerrada." };
    }

    const thread = await prisma.sessionThread.create({
      data: { dailySessionId: sessionId, title },
    });

    return { ok: true, data: { id: thread.id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error al crear hilo.",
    };
  }
}

// ── Messages ─────────────────────────────────────────────────────────

export async function sendMessage(
  threadId: string,
  content: string,
): Promise<
  ActionResult<{
    userMessage: { id: string; content: string };
    assistantMessage: { id: string; content: string };
  }>
> {
  try {
    await ensureRuntimeReady();

    const thread = await prisma.sessionThread.findUniqueOrThrow({
      where: { id: threadId },
      include: { dailySession: { select: { isClosed: true } } },
    });
    if (thread.dailySession.isClosed) {
      return { ok: false, error: "La jornada ya está cerrada." };
    }

    const userMsg = await prisma.threadMessage.create({
      data: { threadId, role: "user", content },
    });

    const replyText = await generateThreadReply(threadId);

    const assistantMsg = await prisma.threadMessage.create({
      data: { threadId, role: "assistant", content: replyText },
    });

    return {
      ok: true,
      data: {
        userMessage: { id: userMsg.id, content: userMsg.content },
        assistantMessage: {
          id: assistantMsg.id,
          content: assistantMsg.content,
        },
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Error al enviar mensaje.",
    };
  }
}

// ── Context Tags ─────────────────────────────────────────────────────

export async function addThreadContext(
  threadId: string,
  tagType: string,
  tagId: string,
  tagLabel: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await ensureRuntimeReady();
    const ctx = await prisma.threadContext.upsert({
      where: {
        threadId_tagType_tagId: { threadId, tagType, tagId },
      },
      create: { threadId, tagType, tagId, tagLabel },
      update: { tagLabel },
    });
    return { ok: true, data: { id: ctx.id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error al añadir tag.",
    };
  }
}

export async function removeThreadContext(
  contextId: string,
): Promise<ActionResult<null>> {
  try {
    await ensureRuntimeReady();
    await prisma.threadContext.delete({ where: { id: contextId } });
    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error al quitar tag.",
    };
  }
}

// ── Coagular Jornada ─────────────────────────────────────────────────

export async function coagulateDaySession(
  sessionId: string,
): Promise<ActionResult<{ summaryMarkdown: string; corpusPath: string }>> {
  try {
    await ensureRuntimeReady();

    const session = await prisma.dailySession.findUniqueOrThrow({
      where: { id: sessionId },
    });

    if (session.isClosed && session.summaryMarkdown) {
      return {
        ok: true,
        data: {
          summaryMarkdown: session.summaryMarkdown,
          corpusPath: "",
        },
      };
    }

    const result = await distillDailySession(sessionId);

    await prisma.dailySession.update({
      where: { id: sessionId },
      data: { isClosed: true, summaryMarkdown: result.summaryMarkdown },
    });

    return {
      ok: true,
      data: {
        summaryMarkdown: result.summaryMarkdown,
        corpusPath: result.corpusPath,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Error al coagular la jornada.",
    };
  }
}
