import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  ingestDocumentSource,
  type SourceIngestSummary,
} from "@/lib/kg/sources/common";
import type { LlmKgExtraction } from "@/lib/kg/types";

const MASTER_PLAN_FILE = "deprocast_master_plan.md";

function stripFrontmatter(source: string): string {
  return source.replace(/^---[\s\S]*?---\r?\n?/, "");
}

type Section = { heading: string; body: string };

/** Divide el documento por encabezados H2 para mantener fragmentos manejables. */
function splitByH2(markdown: string): Section[] {
  const lines = markdown.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      if (current) sections.push(current);
      current = { heading: h2[1].trim(), body: "" };
    } else if (current) {
      current.body += `${line}\n`;
    }
  }
  if (current) sections.push(current);

  return sections.filter((s) => s.body.trim().length > 0);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function buildStructuredSectionExtraction(
  sourceId: string,
  heading: string,
): LlmKgExtraction {
  const sectionConcept = `Sección: ${heading}`;
  return {
    entities: [
      {
        name: sectionConcept,
        type: "concepto",
        metadata: {
          source: "master_plan",
          section: heading,
        },
        confidence: 0.92,
      },
      {
        name: "Deprocast",
        type: "proyecto",
        aliases: ["DeProcast"],
        metadata: { source: "master_plan" },
        confidence: 0.85,
      },
    ],
    relations: [
      {
        fromName: sourceId,
        toName: sectionConcept,
        relationType: "documenta",
        context: `La fuente ${sourceId} documenta la sección "${heading}".`,
        weight: 7,
        confidence: 0.92,
      },
      {
        fromName: sectionConcept,
        toName: "Deprocast",
        relationType: "relacionado_con",
        context: `La sección "${heading}" pertenece al corpus de arquitectura de Deprocast.`,
        weight: 6,
        confidence: 0.9,
      },
    ],
  };
}

/** Ingesta el master plan (grimorio) seccionado por H2. */
export async function ingestMasterPlan(options: {
  model?: string;
  force?: boolean;
} = {}): Promise<SourceIngestSummary[]> {
  const absPath = path.join(process.cwd(), MASTER_PLAN_FILE);
  let source: string;
  try {
    source = await readFile(absPath, "utf-8");
  } catch {
    return [];
  }

  const sections = splitByH2(stripFrontmatter(source));
  const summaries: SourceIngestSummary[] = [];

  for (const section of sections) {
    const sectionSlug = slugify(section.heading) || "seccion";
    const sourceId = `${MASTER_PLAN_FILE}#${sectionSlug}`;
    const structured = buildStructuredSectionExtraction(sourceId, section.heading);

    const outcome = await ingestDocumentSource({
      sourceType: "master_plan",
      sourceId,
      documentPath: sourceId,
      title: section.heading,
      documentMeta: { file: MASTER_PLAN_FILE, section: section.heading },
      body: section.body,
      structured,
      sourceMetadata: { file: MASTER_PLAN_FILE, section: section.heading },
      model: options.model,
      force: options.force,
    });

    summaries.push({
      sourceId,
      title: section.heading,
      skipped: outcome.skipped,
      nodes: outcome.result?.nodeIds.length ?? 0,
      edges: outcome.result?.edgeIds.length ?? 0,
      mentions: outcome.result?.mentionIds.length ?? 0,
    });
  }

  return summaries;
}
