/**
 * Backfill del Knowledge Graph desde las fuentes existentes.
 * - Codigo (deterministico, sin LLM)
 * - Diario, proyectos, documentos crudos y master plan (Cohere Command R)
 *
 * Ejecutar: npm run kg:backfill [-- --force] [-- --only=code,projects,...]
 *
 * Targets validos para --only:
 *   code | journal | projects | documents | masterplan
 */
import "dotenv/config";

import { ingestCodeGraph } from "@/lib/kg/code/ingest";
import {
  ingestJournalEntries,
  ingestMasterPlan,
  ingestProjects,
  ingestRawDocuments,
} from "@/lib/kg/sources";
import type { SourceIngestSummary } from "@/lib/kg/sources/common";
import { getKgStats } from "@/lib/kg/analytics";
import { prisma } from "@/lib/prisma";

const ALL_TARGETS = [
  "code",
  "journal",
  "projects",
  "documents",
  "masterplan",
] as const;
type Target = (typeof ALL_TARGETS)[number];

function parseArgs(): { force: boolean; targets: Target[] } {
  const args = process.argv.slice(2);
  const force = args.includes("--force");

  const onlyArg = args.find((a) => a.startsWith("--only="));
  if (onlyArg) {
    const requested = onlyArg
      .slice("--only=".length)
      .split(",")
      .map((t) => t.trim())
      .filter((t): t is Target => (ALL_TARGETS as readonly string[]).includes(t));
    return { force, targets: requested.length ? requested : [...ALL_TARGETS] };
  }

  return { force, targets: [...ALL_TARGETS] };
}

function reportSummaries(label: string, summaries: SourceIngestSummary[]): void {
  const ingested = summaries.filter((s) => !s.skipped);
  const skipped = summaries.length - ingested.length;
  const nodes = ingested.reduce((acc, s) => acc + s.nodes, 0);
  const edges = ingested.reduce((acc, s) => acc + s.edges, 0);
  const mentions = ingested.reduce((acc, s) => acc + s.mentions, 0);

  console.log(
    `   ${label}: ${ingested.length} ingeridos, ${skipped} sin cambios · ` +
      `nodos=${nodes} edges=${edges} menciones=${mentions}`,
  );
}

async function main(): Promise<void> {
  const { force, targets } = parseArgs();
  console.log(
    `🌌 Backfill del Knowledge Graph (force=${force}) · targets: ${targets.join(", ")}`,
  );

  if (targets.includes("code")) {
    console.log("🧬 Grafo de codigo...");
    const code = await ingestCodeGraph();
    console.log(
      `   codigo: archivos=${code.filesScanned} cambios=${code.filesChanged} ` +
        `modulos=${code.modules} importa=${code.importEdges} modulo->modulo=${code.moduleEdges}`,
    );
  }

  if (targets.includes("projects")) {
    console.log("📁 Proyectos...");
    reportSummaries("proyectos", await ingestProjects({ force }));
  }

  if (targets.includes("journal")) {
    console.log("📓 Diario...");
    reportSummaries("diario", await ingestJournalEntries({ force }));
  }

  if (targets.includes("documents")) {
    console.log("📄 Documentos crudos...");
    reportSummaries("documentos", await ingestRawDocuments({ force }));
  }

  if (targets.includes("masterplan")) {
    console.log("📜 Master plan...");
    reportSummaries("master-plan", await ingestMasterPlan({ force }));
  }

  console.log("\n📊 Estado final del grafo:");
  const stats = await getKgStats();
  console.log(
    `   nodos=${stats.totalNodes} edges=${stats.totalEdges} ` +
      `menciones=${stats.totalMentions} fuentes=${stats.totalSources}`,
  );
  console.log(
    "   por tipo: " +
      stats.nodesByType.map((n) => `${n.type}=${n.count}`).join(" "),
  );

  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error("❌ Fallo el backfill:", error);
  await prisma.$disconnect();
  process.exit(1);
});
