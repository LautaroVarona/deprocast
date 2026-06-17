/**
 * Escaneo deterministico del grafo de codigo (sin LLM).
 * Ejecutar: npm run kg:scan
 */
import "dotenv/config";

import { ingestCodeGraph } from "@/lib/kg/code/ingest";
import { prisma } from "@/lib/prisma";

async function main(): Promise<void> {
  console.log("🧬 Escaneando grafo de codigo del repositorio...");
  const result = await ingestCodeGraph();

  console.log("✅ Grafo de codigo actualizado:");
  console.log(`   - Archivos escaneados: ${result.filesScanned}`);
  console.log(`   - Archivos con cambios: ${result.filesChanged}`);
  console.log(`   - Modulos: ${result.modules}`);
  console.log(`   - Aristas importa: ${result.importEdges}`);
  console.log(`   - Aristas modulo->modulo: ${result.moduleEdges}`);

  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error("❌ Fallo el escaneo de codigo:", error);
  await prisma.$disconnect();
  process.exit(1);
});
