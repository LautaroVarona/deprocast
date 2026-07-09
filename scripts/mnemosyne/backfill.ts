/**
 * Backfill de Mnemosyne (embeddings locales) desde corpus existente.
 *
 * Ejecutar: npm run mnemosyne:backfill [-- --only=journal,kg,projects,notebooks]
 */
import "dotenv/config";

import { JOURNAL_ROOT } from "@/lib/journal/paths";
import { parseJournalFile } from "@/lib/journal/markdown";
import {
  indexJournalMemory,
  indexKgMentionMemory,
  indexNotebookPageMemory,
  indexProjectMemory,
} from "@/lib/mnemosyne/hooks";
import { listProjects } from "@/lib/projects/service";
import { extractMarkdownBody } from "@/lib/projects/markdown";
import { prisma } from "@/lib/prisma";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ALL_TARGETS = ["journal", "kg", "projects", "notebooks"] as const;
type Target = (typeof ALL_TARGETS)[number];

function parseArgs(): { targets: Target[] } {
  const args = process.argv.slice(2);
  const onlyArg = args.find((a) => a.startsWith("--only="));

  if (onlyArg) {
    const requested = onlyArg
      .slice("--only=".length)
      .split(",")
      .map((t) => t.trim())
      .filter((t): t is Target => (ALL_TARGETS as readonly string[]).includes(t));
    return { targets: requested.length ? requested : [...ALL_TARGETS] };
  }

  return { targets: [...ALL_TARGETS] };
}

async function backfillJournal(): Promise<number> {
  let indexed = 0;
  let monthDirs: string[];

  try {
    monthDirs = await readdir(JOURNAL_ROOT);
  } catch {
    return 0;
  }

  for (const monthDirName of monthDirs) {
    const monthDir = path.join(JOURNAL_ROOT, monthDirName);
    let files: string[];
    try {
      files = await readdir(monthDir);
    } catch {
      continue;
    }

    for (const filename of files) {
      if (!filename.endsWith(".md")) continue;
      const filePath = path.join(monthDir, filename);
      const source = await readFile(filePath, "utf-8");
      const relativePath = path.posix.join("journal", monthDirName, filename);
      const parsed = parseJournalFile(source, relativePath);
      if (!parsed) continue;

      await indexJournalMemory({
        id: parsed.id,
        title: parsed.title,
        body: parsed.body,
        relativePath,
        onda: parsed.onda,
      });
      indexed += 1;
    }
  }

  return indexed;
}

async function backfillKgMentions(): Promise<number> {
  const mentions = await prisma.kgMention.findMany({
    include: { node: true },
    orderBy: { createdAt: "asc" },
  });

  let indexed = 0;
  for (const mention of mentions) {
    await indexKgMentionMemory({
      mentionId: mention.id,
      nodeName: mention.node.primaryName,
      fragment: mention.fragment,
      sourceType: mention.sourceType,
      sourceId: mention.sourceId,
    });
    indexed += 1;
  }

  return indexed;
}

async function backfillProjects(): Promise<number> {
  const projects = await listProjects();
  let indexed = 0;

  for (const project of projects) {
    const content = await readFile(project.filePath, "utf-8");
    const body = extractMarkdownBody(content) || project.description;
    if (!body.trim()) continue;

    await indexProjectMemory({
      projectId: project.id,
      title: project.title,
      body,
      relativePath: path.relative(process.cwd(), project.filePath),
    });
    indexed += 1;
  }

  return indexed;
}

async function backfillNotebooks(): Promise<number> {
  const pages = await prisma.notebookPage.findMany({
    where: {
      status: "COMPLETED",
      semanticVector: { not: null },
    },
    include: {
      notebook: { select: { title: true } },
    },
  });

  let indexed = 0;
  for (const page of pages) {
    const semanticVector = page.semanticVector?.trim();
    if (!semanticVector) continue;

    await indexNotebookPageMemory({
      pageId: page.id,
      notebookTitle: page.notebook.title,
      pageNumber: page.pageNumber,
      semanticVector,
      structuralNotes:
        typeof page.structuralVector === "object" &&
        page.structuralVector &&
        "rawNotes" in (page.structuralVector as Record<string, unknown>)
          ? String((page.structuralVector as { rawNotes?: string }).rawNotes ?? "")
          : undefined,
    });
    indexed += 1;
  }

  return indexed;
}

async function main(): Promise<void> {
  const { targets } = parseArgs();
  console.log(`🧠 Mnemosyne backfill · targets: ${targets.join(", ")}`);

  let total = 0;

  if (targets.includes("journal")) {
    const count = await backfillJournal();
    console.log(`   diario: ${count} entradas indexadas`);
    total += count;
  }

  if (targets.includes("kg")) {
    const count = await backfillKgMentions();
    console.log(`   kg_mention: ${count} menciones indexadas`);
    total += count;
  }

  if (targets.includes("projects")) {
    const count = await backfillProjects();
    console.log(`   proyectos: ${count} documentos indexados`);
    total += count;
  }

  if (targets.includes("notebooks")) {
    const count = await backfillNotebooks();
    console.log(`   cuadernos: ${count} páginas indexadas`);
    total += count;
  }

  const embeddings = await prisma.memoryEmbedding.count();
  console.log(`✅ Mnemosyne listo · ${total} fuentes procesadas · ${embeddings} chunks en SQLite`);
}

main().catch((error) => {
  console.error("Mnemosyne backfill error:", error);
  process.exit(1);
});
