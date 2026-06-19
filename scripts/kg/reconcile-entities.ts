/**
 * Reconcilia Entity/Tag legacy con el Knowledge Graph (KgNode/KgEdge/KgMention).
 *
 * Ejecutar: npm run kg:reconcile
 */
import "dotenv/config";

import { getKgStats } from "@/lib/kg/analytics";
import { reconcileLegacyEntities } from "@/lib/kg/reconcile-legacy";
import { prisma } from "@/lib/prisma";

async function main(): Promise<void> {
  console.log("🔄 Reconciliación Entity/Tag → KgNode\n");

  const [entityCount, tagCount, linkCount] = await Promise.all([
    prisma.entity.count(),
    prisma.tag.count(),
    prisma.parentChunkEntity.count() + prisma.parentChunkTag.count(),
  ]);

  console.log("📋 Inventario legacy:");
  console.log(`   Entity:              ${entityCount}`);
  console.log(`   Tag:                 ${tagCount}`);
  console.log(`   Vínculos en chunks:  ${linkCount}\n`);

  if (linkCount === 0) {
    console.log("✅ No hay vínculos legacy que migrar.");
    await prisma.$disconnect();
    return;
  }

  const before = await getKgStats();
  const report = await reconcileLegacyEntities();
  const after = await getKgStats();

  console.log("📊 Resultado de la reconciliación:");
  console.log(
    `   ${report.legacyEntities} entidades legacy · ${report.legacyTags} tags legacy`,
  );
  console.log(
    `   ${report.chunksProcessed} chunks procesados · ${report.chunksSkipped} omitidos`,
  );
  console.log(
    `   → ${report.nodesResolved} nodos únicos · ${report.edgesCreated} aristas · ${report.mentionsCreated} menciones`,
  );
  console.log("\n📈 Grafo antes → después:");
  console.log(
    `   nodos:      ${before.totalNodes} → ${after.totalNodes} (+${after.totalNodes - before.totalNodes})`,
  );
  console.log(
    `   aristas:    ${before.totalEdges} → ${after.totalEdges} (+${after.totalEdges - before.totalEdges})`,
  );
  console.log(
    `   menciones:  ${before.totalMentions} → ${after.totalMentions} (+${after.totalMentions - before.totalMentions})`,
  );

  const unmigratedLinks =
    (await prisma.parentChunkEntity.count()) +
    (await prisma.parentChunkTag.count());

  if (unmigratedLinks > 0) {
    console.log(
      `\n⚠️  Aún existen ${unmigratedLinks} vínculos legacy en DB (datos preservados hasta migración de esquema).`,
    );
    console.log(
      "   Verificá centralidad y búsqueda; luego aplicá la migración de limpieza Prisma.",
    );
  } else {
    console.log("\n✅ Reconciliación completada.");
  }

  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error("❌ Falló la reconciliación:", error);
  await prisma.$disconnect();
  process.exit(1);
});
