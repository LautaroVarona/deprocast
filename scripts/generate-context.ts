/**
 * El Reflector — genera deprocast_state.md con el estado vivo del repositorio.
 * Ejecutar: npm run context
 */

import { access, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT_FILE = path.join(ROOT, "deprocast_state.md");

const DATA_ROOTS = [
  "data/raw_documents/pending",
  "data/raw_documents/completed",
  "data/tacho",
] as const;

const TACHO_EXPECTED = ["celulares", "notas", "capturas", "misc"] as const;

const AUDIO_PIPELINE_FILES = [
  "lib/gcp-speech-processor.ts",
  "lib/processing-queue.ts",
  "lib/gcp-speech/config.ts",
  "lib/gcp-speech/client.ts",
  "lib/gcp-speech/audio-prep.ts",
  "lib/gcp-speech/ffmpeg-bin.ts",
  "lib/gcp-speech/transcribe-sync.ts",
  "lib/gcp-speech/transcribe-chunked.ts",
  "lib/gcp-speech/errors.ts",
  "lib/gcp-speech/retry.ts",
  "lib/gcp-speech/logger.ts",
] as const;

const GAMIFICATION_MARKERS = [
  { pattern: /model\s+Project\b/i, label: "Project" },
  { pattern: /model\s+Microtask\b/i, label: "Microtask" },
  { pattern: /model\s+FocusSession\b/i, label: "FocusSession" },
  { pattern: /focus.?work/i, label: "Focus Work (referencia en código)" },
] as const;

type DirEntry = {
  name: string;
  type: "file" | "dir";
  children?: DirEntry[];
};

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function listFilesInDir(dirPath: string): Promise<string[]> {
  if (!(await pathExists(dirPath))) return [];
  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
}

async function buildDirTree(
  dirPath: string,
  maxDepth: number,
  currentDepth = 0,
): Promise<DirEntry[]> {
  if (currentDepth > maxDepth || !(await pathExists(dirPath))) return [];

  const entries = await readdir(dirPath, { withFileTypes: true });
  const sorted = entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  const result: DirEntry[] = [];

  for (const entry of sorted) {
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        type: "dir",
        children: await buildDirTree(fullPath, maxDepth, currentDepth + 1),
      });
    } else {
      result.push({ name: entry.name, type: "file" });
    }
  }

  return result;
}

function renderTree(entries: DirEntry[], prefix = ""): string[] {
  const lines: string[] = [];

  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const branch = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";

    if (entry.type === "dir") {
      lines.push(`${prefix}${branch}${entry.name}/`);
      if (entry.children && entry.children.length > 0) {
        lines.push(...renderTree(entry.children, prefix + childPrefix));
      }
    } else {
      lines.push(`${prefix}${branch}${entry.name}`);
    }
  });

  return lines;
}

async function scanAppRoutes(): Promise<string[]> {
  const appDir = path.join(ROOT, "app");
  if (!(await pathExists(appDir))) return ["_(directorio `app/` no encontrado)_"];

  const routes: string[] = [];

  async function walk(current: string, routePrefix: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;

      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        const segment =
          entry.name.startsWith("(") && entry.name.endsWith(")")
            ? ""
            : `/${entry.name === "[id]" ? "[id]" : entry.name}`;
        await walk(fullPath, `${routePrefix}${segment}`);
        continue;
      }

      if (entry.name === "page.tsx" || entry.name === "page.ts") {
        routes.push(routePrefix || "/");
      }

      if (entry.name === "route.ts" || entry.name === "route.js") {
        const apiPath = routePrefix.replace(/^\/api/, "/api") || "/api";
        const methods = await detectRouteMethods(fullPath);
        routes.push(`${apiPath} [${methods.join(", ") || "HTTP"}]`);
      }
    }
  }

  await walk(appDir, "");
  return [...new Set(routes)].sort((a, b) => a.localeCompare(b));
}

async function detectRouteMethods(routeFile: string): Promise<string[]> {
  try {
    const source = await readFile(routeFile, "utf-8");
    const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
    return methods.filter((m) =>
      new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(source),
    );
  } catch {
    return [];
  }
}

async function findShellAndBashScripts(): Promise<string[]> {
  const hits: string[] = [];
  const dirsToScan = ["scripts", "bin", "tools", "."];

  for (const rel of dirsToScan) {
    const dir = path.join(ROOT, rel);
    if (!(await pathExists(dir))) continue;

    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (/\.(sh|bash)$/i.test(entry.name)) {
        hits.push(path.join(rel, entry.name).replace(/\\/g, "/"));
      }
    }
  }

  return hits.sort();
}

async function getAudioPipelineStatus(): Promise<{
  modules: { path: string; exists: boolean }[];
  shellScripts: string[];
  whisperRefs: string[];
  ffmpegModule: boolean;
  processor: string;
}> {
  const modules = await Promise.all(
    AUDIO_PIPELINE_FILES.map(async (rel) => ({
      path: rel,
      exists: await pathExists(path.join(ROOT, rel)),
    })),
  );

  const shellScripts = await findShellAndBashScripts();

  const whisperScanFiles = [
    "components/dashboard.tsx",
    "lib/processing-queue.ts",
    "scripts/validate-gcp-config.mjs",
    ...AUDIO_PIPELINE_FILES,
  ];

  const whisperRefs: string[] = [];
  for (const rel of whisperScanFiles) {
    const full = path.join(ROOT, rel);
    if (!(await pathExists(full))) continue;
    const source = await readFile(full, "utf-8");
    if (/whisper/i.test(source)) whisperRefs.push(rel);
  }

  const queuePath = path.join(ROOT, "lib/processing-queue.ts");
  let processor = "desconocido";
  if (await pathExists(queuePath)) {
    const source = await readFile(queuePath, "utf-8");
    if (source.includes("processAssetGcpSpeech")) {
      processor = "GCP Cloud Speech (`processAssetGcpSpeech`)";
    } else if (source.includes("whisper")) {
      processor = "Whisper local (legacy)";
    }
  }

  return {
    modules,
    shellScripts,
    whisperRefs,
    ffmpegModule: modules.find((m) => m.path.endsWith("ffmpeg-bin.ts"))?.exists ?? false,
    processor,
  };
}

async function getTextIngestStatus(): Promise<{
  componentExists: boolean;
  pendingFiles: string[];
  completedFiles: string[];
  apiExists: boolean;
}> {
  const pendingDir = path.join(ROOT, "data/raw_documents/pending");
  const completedDir = path.join(ROOT, "data/raw_documents/completed");

  return {
    componentExists: await pathExists(
      path.join(ROOT, "components/text-ingest-form.tsx"),
    ),
    pendingFiles: await listFilesInDir(pendingDir),
    completedFiles: await listFilesInDir(completedDir),
    apiExists: await pathExists(path.join(ROOT, "app/api/documents/route.ts")),
  };
}

async function getGamificationStatus(): Promise<{
  schemaPath: string;
  schemaExists: boolean;
  modelsFound: string[];
  modelsMissing: string[];
  dbPath: string | null;
  dbExists: boolean;
  audioAssetCount: number | null;
  weightRange: string;
  focusUiExists: boolean;
}> {
  const schemaPath = path.join(ROOT, "prisma/schema.prisma");
  const schemaExists = await pathExists(schemaPath);

  let modelsFound: string[] = [];
  let schemaSource = "";

  if (schemaExists) {
    schemaSource = await readFile(schemaPath, "utf-8");
    for (const marker of GAMIFICATION_MARKERS) {
      if (marker.pattern.test(schemaSource)) {
        modelsFound.push(marker.label);
      }
    }
  }

  const expectedModels = ["Project", "Microtask", "FocusSession"];
  const modelsMissing = expectedModels.filter(
    (m) => !modelsFound.some((f) => f.toLowerCase().includes(m.toLowerCase())),
  );

  let dbPath: string | null = null;
  let dbExists = false;
  let audioAssetCount: number | null = null;

  const envExample = path.join(ROOT, ".env.example");
  let defaultDb = "prisma/dev.db";
  if (await pathExists(envExample)) {
    const env = await readFile(envExample, "utf-8");
    const match = env.match(/DATABASE_URL="file:(.+?)"/);
    if (match) defaultDb = match[1];
  }

  dbPath = path.join(ROOT, defaultDb);
  dbExists = await pathExists(dbPath);

  if (dbExists) {
    try {
      const Database = (await import("better-sqlite3")).default;
      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      const row = db
        .prepare("SELECT COUNT(*) AS count FROM AudioAsset")
        .get() as { count: number };
      audioAssetCount = row.count;
      db.close();
    } catch {
      audioAssetCount = null;
    }
  }

  const constantsPath = path.join(ROOT, "lib/document-constants.ts");
  let weightRange = "1–12 (definido en document-constants)";
  if (await pathExists(constantsPath)) {
    const src = await readFile(constantsPath, "utf-8");
    const min = src.match(/MIN_BASE_WEIGHT\s*=\s*(\d+)/)?.[1];
    const max = src.match(/MAX_BASE_WEIGHT\s*=\s*(\d+)/)?.[1];
    if (min && max) weightRange = `${min}–${max}`;
  }

  const focusUiExists = await pathExists(
    path.join(ROOT, "components/focus-work"),
  );

  return {
    schemaPath: "prisma/schema.prisma",
    schemaExists,
    modelsFound,
    modelsMissing,
    dbPath: dbPath ? path.relative(ROOT, dbPath).replace(/\\/g, "/") : null,
    dbExists,
    audioAssetCount,
    weightRange,
    focusUiExists,
  };
}

async function buildMarkdown(): Promise<string> {
  const timestamp = new Date().toISOString();

  const dataTrees: string[] = [];
  for (const rel of DATA_ROOTS) {
    const abs = path.join(ROOT, rel);
    const exists = await pathExists(abs);
    dataTrees.push(`### \`${rel}/\`${exists ? "" : " _(no existe aún)_"}`);
    if (exists) {
      const tree = await buildDirTree(abs, 3);
      if (tree.length === 0) {
        dataTrees.push("_vacío_");
      } else {
        dataTrees.push("```");
        dataTrees.push(`${rel}/`);
        dataTrees.push(...renderTree(tree));
        dataTrees.push("```");
      }
    } else {
      dataTrees.push("_directorio pendiente de creación_");
    }
    dataTrees.push("");
  }

  const tachoDir = path.join(ROOT, "data/tacho");
  const tachoStatus: string[] = [];
  for (const sub of TACHO_EXPECTED) {
    const subPath = path.join(tachoDir, sub);
    const exists = await pathExists(subPath);
    const fileCount = exists ? (await listFilesInDir(subPath)).length : 0;
    tachoStatus.push(
      `- \`data/tacho/${sub}/\`: ${exists ? `${fileCount} archivo(s)` : "no creado"}`,
    );
  }

  const appRoutes = await scanAppRoutes();
  const audio = await getAudioPipelineStatus();
  const textIngest = await getTextIngestStatus();
  const gamification = await getGamificationStatus();

  const textIngestModuleLines = [
    `- **Componente UI:** \`TextIngestForm\` — ${textIngest.componentExists ? "presente (`components/text-ingest-form.tsx`)" : "no encontrado"}`,
    `- **API REST:** \`POST /api/documents\` — ${textIngest.apiExists ? "activa" : "no encontrada"}`,
    `- **Destino de escritura:** \`data/raw_documents/pending/\``,
    `- **Archivos en pending:** ${textIngest.pendingFiles.length === 0 ? "_ninguno_" : textIngest.pendingFiles.map((f) => `\`${f}\``).join(", ")}`,
    `- **Archivos en completed:** ${textIngest.completedFiles.length === 0 ? "_ninguno_" : textIngest.completedFiles.map((f) => `\`${f}\``).join(", ")}`,
  ];

  const audioModuleLines = [
    `- **Motor activo:** ${audio.processor}`,
    `- **Preparación de audio:** FFmpeg vía \`ffmpeg-static\` + \`ffprobe-static\` (\`lib/gcp-speech/audio-prep.ts\`, \`ffmpeg-bin.ts\`)`,
    `- **Cola de procesamiento:** \`lib/processing-queue.ts\` (serial, con cancelación)`,
    `- **Scripts shell/bash locales:** ${audio.shellScripts.length === 0 ? "_ninguno detectado_" : audio.shellScripts.map((s) => `\`${s}\``).join(", ")}`,
    `- **Whisper local / VAD:** _no implementado en código activo_; referencias residuales en: ${audio.whisperRefs.length === 0 ? "_ninguna_" : audio.whisperRefs.map((r) => `\`${r}\``).join(", ")}`,
    `- **Módulos GCP Speech detectados:**`,
  ];

  for (const mod of audio.modules) {
    audioModuleLines.push(`  - \`${mod.path}\` — ${mod.exists ? "OK" : "FALTA"}`);
  }

  const gamificationLines = [
    `### Base de datos local (SQLite + Prisma)`,
    `- **Schema:** \`${gamification.schemaPath}\` — ${gamification.schemaExists ? "presente" : "no encontrado"}`,
    `- **Archivo DB:** \`${gamification.dbPath ?? "N/A"}\` — ${gamification.dbExists ? "existe" : "no creado aún"}`,
    `- **Modelos de Proyectos / Microtareas:** ${gamification.modelsMissing.length === 3 ? "_no implementados en schema_" : `parcial: ${gamification.modelsFound.join(", ")}`}`,
    `- **Modelos actuales en DB:** AudioAsset, Transcript, ParentChunk, ChildChunk, Entity, Tag`,
    gamification.audioAssetCount !== null
      ? `- **AudioAssets registrados:** ${gamification.audioAssetCount}`
      : `- **AudioAssets registrados:** _no consultable_`,
    ``,
    `### UI Focus Work (puntajes 1–12)`,
    `- **Estado:** ${gamification.focusUiExists ? "componentes detectados" : "_no implementada — fase cero_"}`,
    `- **Precursor de pesos:** el formulario de ingesta de texto usa \`base_weight\` en rango **${gamification.weightRange}** (\`lib/document-constants.ts\`), alineado al diseño futuro de gamificación`,
  ];

  return [
    "---",
    'materia: "v1.0-local-state"',
    'particula: "deprocast-core"',
    'posicion: "localhost-ubuntu"',
    'onda: "infrastructure-log"',
    `tiempo: "${timestamp}"`,
    'espacio: "development-phase-zero"',
    'field: "knowledge-ingestion-and-stt"',
    "---",
    "",
    "# Estado Actual de la Infraestructura DeProcast",
    "",
    `_Generado por **El Reflector** (\`scripts/generate-context.ts\`) el ${timestamp}_`,
    "",
    "## 🗺️ 1. Mapa de Directorios Activos",
    "",
    "Árbol enfocado en rutas de datos de ingesta y el Tacho de la Boludez.",
    "",
    ...dataTrees,
    "### Tacho de la Boludez — subcarpetas esperadas",
    "",
    ...tachoStatus,
    "",
    "### Rutas App Router (`app/`)",
    "",
    ...appRoutes.map((r) => `- \`${r}\``),
    "",
    "## 📥 2. Estado del Pipeline de Ingesta (Texto y Audio)",
    "",
    "### Módulo Manual de Texto",
    "",
    ...textIngestModuleLines,
    "",
    "### Módulo STT (Audio)",
    "",
    ...audioModuleLines,
    "",
    "> **Nota:** El dashboard aún menciona Whisper en copy de UI, pero el pipeline ejecutivo usa **Google Cloud Speech-to-Text** (modelo `chirp_2`). No hay integración Whisper/VAD local ni scripts bash de transcripción en el repo.",
    "",
    "## 🎮 3. Módulos de Gamificación y Enfoque (Fase Actual)",
    "",
    ...gamificationLines,
    "",
    "---",
    "",
    "_Fin del snapshot. Regenerar con `npm run context`._",
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  console.log("🔮 El Reflector — escaneando repositorio DeProcast...");
  const markdown = await buildMarkdown();
  await writeFile(OUTPUT_FILE, markdown, "utf-8");
  console.log(`✅ Snapshot escrito en ${path.relative(ROOT, OUTPUT_FILE)}`);
}

main().catch((error: unknown) => {
  console.error("❌ El Reflector falló:", error);
  process.exit(1);
});
