import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { cohereGenerateJson } from "@/lib/cohere/chat";
import { getDataPath } from "@/lib/runtime-paths";

export type DestiladorSections = {
  resumenDia: string;
  decisiones: string[];
  promesas: string[];
  bloqueosRiesgos: string[];
  contextoCitado: string[];
  hilosDestilados: { titulo: string; sintesis: string }[];
  outputs: string[];
};

const DESTILADOR_JORNADA_SYSTEM = `Sos el agente Destilador de Jornada del Atanor Temporal de Deprocast OS.
Tu tarea: recibís el transcript completo de todos los hilos paralelos de un día de trabajo y extraés un documento indexable para el Corpus de memoria.

Reglas estrictas:
- NO inventés hechos que no estén en el transcript.
- Si una sección queda vacía, usá un array vacío o string vacío — nunca inventés contenido de relleno.
- Priorizá señal sobre narrativa. Sé conciso y operativo.
- Idioma: español.
- Respondé SOLO con JSON válido (sin explicaciones, sin markdown fences, sin texto antes o después).

Campos del JSON de salida:
- resumenDia (string): 2–4 frases con la esencia del día.
- decisiones (string[]): cada decisión tomada o confirmada.
- promesas (string[]): compromisos abiertos hacia el futuro.
- bloqueosRiesgos (string[]): bloqueos detectados o riesgos mencionados.
- contextoCitado (string[]): universos, proyectos, personas referenciados.
- hilosDestilados (array de { titulo: string, sintesis: string }): un resumen por hilo.
- outputs (string[]): artefactos generados, siguientes pasos concretos.`;

function getJornadaDir(): string {
  return getDataPath("memory", "jornadas");
}

function getJornadaPath(date: string): string {
  return path.join(getJornadaDir(), `${date}.md`);
}

function getJornadaIndexPath(): string {
  return path.join(getJornadaDir(), "INDEX.md");
}

function toMarkdown(
  date: string,
  sessionId: string,
  sections: DestiladorSections,
): string {
  const lines: string[] = [
    "---",
    `session_id: "${sessionId}"`,
    `date: "${date}"`,
    `kind: daily_session`,
    `distilled_at: "${new Date().toISOString()}"`,
    "---",
    "",
    `# Jornada ${date}`,
    "",
    "## Resumen del día",
    "",
    sections.resumenDia || "_Sin resumen._",
    "",
  ];

  const section = (title: string, items: string[]) => {
    lines.push(`## ${title}`, "");
    if (items.length === 0) {
      lines.push("_Ninguno._");
    } else {
      for (const item of items) lines.push(`- ${item}`);
    }
    lines.push("");
  };

  section("Decisiones", sections.decisiones);
  section("Promesas / Compromisos", sections.promesas);
  section("Bloqueos y Riesgos", sections.bloqueosRiesgos);
  section("Contexto citado", sections.contextoCitado);

  lines.push("## Hilos destilados", "");
  if (sections.hilosDestilados.length === 0) {
    lines.push("_Sin hilos._");
  } else {
    for (const h of sections.hilosDestilados) {
      lines.push(`### ${h.titulo}`, "", h.sintesis, "");
    }
  }

  section("Outputs / Siguientes pasos", sections.outputs);

  return lines.join("\n");
}

function serializeSession(
  session: {
    id: string;
    date: string;
    threads: {
      title: string;
      topic: string | null;
      contexts: { tagType: string; tagLabel: string }[];
      messages: { role: string; content: string; createdAt: Date }[];
    }[];
  },
): string {
  const parts: string[] = [`JORNADA: ${session.date}`, ""];

  for (const thread of session.threads) {
    parts.push(`── HILO: ${thread.title}${thread.topic ? ` [${thread.topic}]` : ""}`);

    if (thread.contexts.length > 0) {
      const tags = thread.contexts
        .map((c) => `[${c.tagType}] ${c.tagLabel}`)
        .join(", ");
      parts.push(`   Contexto: ${tags}`);
    }

    parts.push("");

    for (const m of thread.messages) {
      const role = m.role === "user" ? "Operador" : "Copiloto";
      parts.push(`${role}: ${m.content.slice(0, 2000)}`);
    }
    parts.push("");
  }

  return parts.join("\n").slice(0, 16_000);
}

async function appendJornadaIndex(input: {
  sessionId: string;
  date: string;
  preview: string;
}): Promise<void> {
  const indexPath = getJornadaIndexPath();
  await mkdir(path.dirname(indexPath), { recursive: true });

  let existing = "";
  try {
    existing = await readFile(indexPath, "utf-8");
  } catch {
    existing = [
      "# Jornadas Destiladas · INDEX",
      "",
      "Índice de átomos de jornada diaria para recall del Corpus.",
      "",
    ].join("\n");
  }

  if (existing.includes(input.sessionId)) return;

  const line = `- [${input.date}](${input.date}.md) · \`${input.sessionId}\` — ${input.preview.slice(0, 120)}`;
  await writeFile(indexPath, existing.trimEnd() + "\n" + line + "\n", "utf-8");
}

export async function distillDailySession(sessionId: string): Promise<{
  summaryMarkdown: string;
  corpusPath: string;
  sections: DestiladorSections;
}> {
  const session = await prisma.dailySession.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      threads: {
        include: {
          contexts: { select: { tagType: true, tagLabel: true } },
          messages: {
            orderBy: { createdAt: "asc" },
            select: { role: true, content: true, createdAt: true },
          },
        },
      },
    },
  });

  const transcript = serializeSession(session);

  const parsed = await cohereGenerateJson<Partial<DestiladorSections>>({
    systemPrompt: DESTILADOR_JORNADA_SYSTEM,
    userContent: transcript,
    temperature: 0.15,
    maxTokens: 2000,
    throttle: true,
  });

  const sections: DestiladorSections = {
    resumenDia: parsed.resumenDia ?? "",
    decisiones: parsed.decisiones ?? [],
    promesas: parsed.promesas ?? [],
    bloqueosRiesgos: parsed.bloqueosRiesgos ?? [],
    contextoCitado: parsed.contextoCitado ?? [],
    hilosDestilados: parsed.hilosDestilados ?? [],
    outputs: parsed.outputs ?? [],
  };

  const md = toMarkdown(session.date, sessionId, sections);

  await mkdir(getJornadaDir(), { recursive: true });
  const corpusPath = getJornadaPath(session.date);
  await writeFile(corpusPath, md, "utf-8");

  await appendJornadaIndex({
    sessionId,
    date: session.date,
    preview: sections.resumenDia,
  });

  return { summaryMarkdown: md, corpusPath, sections };
}
