import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { scanCodeGraph, type CodeGraph, type ScannedFile } from "@/lib/kg/code/scan";
import { hashContent, recordSourceIngestion, sourceHasChanged } from "@/lib/kg/incremental";

const CODE_CONFIDENCE = 0.95;

export type CodeIngestResult = {
  filesScanned: number;
  filesChanged: number;
  modules: number;
  importEdges: number;
  moduleEdges: number;
};

type NodeCache = Map<string, string>;

function cacheKey(type: string, primaryName: string): string {
  return `${type}\u0000${primaryName}`;
}

async function ensureNode(
  cache: NodeCache,
  type: string,
  primaryName: string,
  metadata: Record<string, unknown>,
): Promise<string> {
  const key = cacheKey(type, primaryName);
  const cached = cache.get(key);
  if (cached) return cached;

  const node = await prisma.kgNode.upsert({
    where: { primaryName_type: { primaryName, type } },
    create: {
      primaryName,
      type,
      aliases: [],
      metadata: metadata as Prisma.InputJsonValue,
      confidence: CODE_CONFIDENCE,
    },
    update: { metadata: metadata as Prisma.InputJsonValue },
  });

  cache.set(key, node.id);
  return node.id;
}

async function ensureEdge(
  sourceNodeId: string,
  targetNodeId: string,
  relationType: string,
  context: string,
  weight: number | undefined,
): Promise<void> {
  if (sourceNodeId === targetNodeId) return;
  await prisma.kgEdge.upsert({
    where: {
      sourceNodeId_targetNodeId_relationType: {
        sourceNodeId,
        targetNodeId,
        relationType,
      },
    },
    create: {
      sourceNodeId,
      targetNodeId,
      relationType,
      context,
      weight,
      confidence: CODE_CONFIDENCE,
      metadata: { kind: "code" },
    },
    update: { context, weight: weight ?? undefined },
  });
}

function fileSignature(file: ScannedFile): string {
  return hashContent(
    JSON.stringify({
      imports: [...file.imports].sort(),
      externalImports: [...file.externalImports].sort(),
      module: file.module,
    }),
  );
}

/**
 * Persiste el grafo de codigo en el KG. Incremental: solo reescribe las
 * aristas `importa` de archivos cuyo conjunto de imports cambio.
 */
export async function ingestCodeGraph(
  graph?: CodeGraph,
): Promise<CodeIngestResult> {
  const codeGraph = graph ?? (await scanCodeGraph());
  const cache: NodeCache = new Map();

  // 1. Modulos.
  for (const moduleName of codeGraph.modules) {
    await ensureNode(cache, "modulo", moduleName, { path: moduleName });
  }

  // 2. Archivos + pertenece_a + imports (incremental).
  let filesChanged = 0;
  let importEdges = 0;

  for (const file of codeGraph.files) {
    const fileNodeId = await ensureNode(cache, "archivo", file.path, {
      path: file.path,
      module: file.module,
      ext: file.ext,
      loc: file.loc,
      externalImports: file.externalImports,
    });

    const moduleNodeId = await ensureNode(cache, "modulo", file.module, {
      path: file.module,
    });
    await ensureEdge(
      fileNodeId,
      moduleNodeId,
      "pertenece_a",
      `Archivo ${file.path} pertenece al modulo ${file.module}.`,
      undefined,
    );

    const signature = JSON.stringify({
      imports: [...file.imports].sort(),
      externalImports: [...file.externalImports].sort(),
      module: file.module,
    });

    const changed = await sourceHasChanged(
      { sourceType: "code_file", sourceId: file.path },
      signature,
    );

    if (changed) {
      filesChanged += 1;
      // Reescribir aristas importa del archivo.
      await prisma.kgEdge.deleteMany({
        where: { sourceNodeId: fileNodeId, relationType: "importa" },
      });

      for (const imp of file.imports) {
        const targetId = await ensureNode(cache, "archivo", imp, {
          path: imp,
        });
        await ensureEdge(
          fileNodeId,
          targetId,
          "importa",
          `${file.path} importa ${imp}.`,
          undefined,
        );
        importEdges += 1;
      }

      await recordSourceIngestion(
        { sourceType: "code_file", sourceId: file.path },
        signature,
        { nodeCount: 1, edgeCount: file.imports.length },
        { fileSignature: fileSignature(file) },
      );
    } else {
      importEdges += file.imports.length;
    }
  }

  // 3. Aristas modulo -> modulo (recompute completo, barato).
  for (const edge of codeGraph.moduleEdges) {
    const fromId = await ensureNode(cache, "modulo", edge.from, {
      path: edge.from,
    });
    const toId = await ensureNode(cache, "modulo", edge.to, { path: edge.to });
    await ensureEdge(
      fromId,
      toId,
      "depende_de",
      `Modulo ${edge.from} depende de ${edge.to} (${edge.weight} import(s)).`,
      Math.min(12, edge.weight),
    );
  }

  return {
    filesScanned: codeGraph.files.length,
    filesChanged,
    modules: codeGraph.modules.length,
    importEdges,
    moduleEdges: codeGraph.moduleEdges.length,
  };
}
