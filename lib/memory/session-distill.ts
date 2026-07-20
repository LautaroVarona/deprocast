import "server-only";

import { cohereGenerateJson } from "@/lib/cohere/chat";
import { prisma } from "@/lib/prisma";
import {
  getMemoryIndexPath,
  getSessionMarkdownPath,
  getSessionsDir,
} from "@/lib/memory/paths";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type SessionDistillSections = {
  objetivo: string;
  notasEnEjecucion: string;
  supuestosPreguntasAbiertas: string;
  outputsGenerados: string;
};

const DISTILL_SYSTEM = `Destilás conversaciones del Exocórtex a un átomo de memoria indexable.
Devolvé SOLO JSON con:
- objetivo: objetivo de la sesión (1-3 frases)
- notasEnEjecucion: notas en ejecución (bullets en un string)
- supuestosPreguntasAbiertas: supuestos y preguntas abiertas
- outputsGenerados: outputs generados (archivos, decisiones, código, etc.)
Sin ruido. Español. Máximo ~400 tokens totales.`;

function toMarkdown(
  sessionId: string,
  title: string,
  sections: SessionDistillSections,
): string {
  return [
    "---",
    `session_id: "${sessionId}"`,
    `title: ${JSON.stringify(title)}`,
    `distilled_at: "${new Date().toISOString()}"`,
    "kind: chat_session",
    "---",
    "",
    `# ${title}`,
    "",
    "## Objetivo de la sesión",
    "",
    sections.objetivo.trim() || "_Sin objetivo explícito._",
    "",
    "## Notas en ejecución",
    "",
    sections.notasEnEjecucion.trim() || "_Sin notas._",
    "",
    "## Supuestos/Preguntas abiertas",
    "",
    sections.supuestosPreguntasAbiertas.trim() || "_Ninguno._",
    "",
    "## Outputs generados",
    "",
    sections.outputsGenerados.trim() || "_Ninguno._",
    "",
  ].join("\n");
}

async function appendIndexEntry(input: {
  sessionId: string;
  title: string;
  relativePath: string;
  preview: string;
}): Promise<void> {
  const indexPath = getMemoryIndexPath();
  await mkdir(path.dirname(indexPath), { recursive: true });

  let existing = "";
  try {
    existing = await readFile(indexPath, "utf-8");
  } catch {
    existing = [
      "# Infinite Brain · INDEX",
      "",
      "Manifiesto ligero de átomos de memoria. El recall lee primero este archivo.",
      "",
      "## Sesiones destiladas",
      "",
    ].join("\n");
  }

  const line = `- [${input.title}](${input.relativePath}) · \`${input.sessionId}\` — ${input.preview.slice(0, 120)}`;
  if (existing.includes(input.sessionId)) {
    return;
  }

  const next = existing.trimEnd() + "\n" + line + "\n";
  await writeFile(indexPath, next, "utf-8");
}

/**
 * Destila una sesión de chat a Markdown normativo bajo data/memory/sessions/.
 */
export async function distillChatSession(
  sessionId: string,
): Promise<{ path: string; sections: SessionDistillSections } | null> {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) return null;

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: 80,
    select: { role: true, content: true },
  });

  if (messages.length === 0) return null;

  const transcript = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n")
    .slice(0, 12_000);

  let sections: SessionDistillSections;
  try {
    const parsed = await cohereGenerateJson<Partial<SessionDistillSections>>({
      systemPrompt: DISTILL_SYSTEM,
      userContent: transcript,
      temperature: 0.1,
      maxTokens: 600,
      throttle: true,
    });
    sections = {
      objetivo: parsed.objetivo ?? "",
      notasEnEjecucion: parsed.notasEnEjecucion ?? "",
      supuestosPreguntasAbiertas: parsed.supuestosPreguntasAbiertas ?? "",
      outputsGenerados: parsed.outputsGenerados ?? "",
    };
  } catch (error) {
    console.warn("Session distill Cohere fallback:", error);
    sections = {
      objetivo: session.title,
      notasEnEjecucion: messages
        .filter((m) => m.role === "user")
        .slice(-5)
        .map((m) => `- ${m.content.slice(0, 200)}`)
        .join("\n"),
      supuestosPreguntasAbiertas: "",
      outputsGenerados: messages
        .filter((m) => m.role === "assistant")
        .slice(-3)
        .map((m) => `- ${m.content.slice(0, 200)}`)
        .join("\n"),
    };
  }

  await mkdir(getSessionsDir(), { recursive: true });
  const filePath = getSessionMarkdownPath(sessionId);
  const md = toMarkdown(sessionId, session.title, sections);
  await writeFile(filePath, md, "utf-8");

  await appendIndexEntry({
    sessionId,
    title: session.title,
    relativePath: `sessions/${sessionId}.md`,
    preview: sections.objetivo || sections.notasEnEjecucion,
  });

  return { path: filePath, sections };
}

/** Cierra sesiones idle (updatedAt < now - idleHours) destilando antes de borrar. */
export async function distillIdleChatSessions(
  idleHours = 24,
): Promise<{ distilled: number; deleted: number }> {
  const cutoff = new Date(Date.now() - idleHours * 60 * 60 * 1000);
  const idle = await prisma.chatSession.findMany({
    where: { updatedAt: { lt: cutoff } },
    select: { id: true },
    take: 20,
  });

  let distilled = 0;
  let deleted = 0;

  for (const session of idle) {
    const result = await distillChatSession(session.id);
    if (result) distilled += 1;
    await prisma.chatSession.delete({ where: { id: session.id } }).catch(() => null);
    deleted += 1;
  }

  return { distilled, deleted };
}
