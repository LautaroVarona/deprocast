import "server-only";

import { prisma } from "@/lib/prisma";
import { cohereGenerateText } from "@/lib/cohere/chat";

const HISTORY_LIMIT = 40;

const ATANOR_THREAD_SYSTEM = `Sos el copiloto del Atanor Temporal, el Workspace Diario de Deprocast OS.
Tu rol es ayudar al operador a pensar en voz alta dentro de un hilo del día.
Capturá decisiones, tareas implícitas, matices y tensiones.
Respondé en español operativo y conciso. No inventés hechos que no estén en el contexto dado.
Si te falta contexto, preguntá en vez de suponer.
Nunca coagulés ni cierrés el día vos mismo — eso lo hace el Destilador al cerrar la jornada.`;

function buildSystemPrompt(thread: {
  title: string;
  topic: string | null;
  contexts: { tagType: string; tagLabel: string }[];
}): string {
  const parts = [ATANOR_THREAD_SYSTEM];

  if (thread.title || thread.topic) {
    parts.push(
      `\n## Hilo activo\nTítulo: ${thread.title}${thread.topic ? `\nTema/Rol: ${thread.topic}` : ""}`,
    );
  }

  if (thread.contexts.length > 0) {
    const tags = thread.contexts
      .map((c) => `- [${c.tagType}] ${c.tagLabel}`)
      .join("\n");
    parts.push(`\n## Contexto anclado\n${tags}`);
  }

  return parts.join("\n");
}

function formatTranscript(
  messages: { role: string; content: string }[],
): string {
  return messages
    .map((m) => `${m.role === "user" ? "Operador" : "Copiloto"}: ${m.content}`)
    .join("\n\n");
}

export async function generateThreadReply(
  threadId: string,
): Promise<string> {
  const thread = await prisma.sessionThread.findUniqueOrThrow({
    where: { id: threadId },
    include: {
      contexts: { select: { tagType: true, tagLabel: true } },
    },
  });

  const messages = await prisma.threadMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: HISTORY_LIMIT,
    select: { role: true, content: true },
  });

  const systemPrompt = buildSystemPrompt(thread);
  const transcript = formatTranscript(messages);

  return cohereGenerateText({
    systemPrompt,
    userContent: transcript,
    modelKind: "default",
    temperature: 0.3,
    throttle: true,
  });
}
