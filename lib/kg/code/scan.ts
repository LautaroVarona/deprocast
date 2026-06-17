import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

// Carpetas del repo que forman el subgrafo de codigo.
const SCAN_DIRS = ["app", "lib", "components", "scripts", "types"] as const;

const SCAN_EXTENSIONS = [".ts", ".tsx"] as const;
const RESOLVE_EXTENSIONS = [".ts", ".tsx", ".d.ts", ".js", ".jsx"] as const;
const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
]);

export type ScannedFile = {
  /** Ruta relativa POSIX al repo, ej. "lib/kg/code/scan.ts". */
  path: string;
  /** Modulo (carpeta) al que pertenece, ej. "lib/kg/code". */
  module: string;
  ext: string;
  loc: number;
  /** Imports internos resueltos a rutas de archivo del repo. */
  imports: string[];
  /** Paquetes externos (npm) importados. */
  externalImports: string[];
};

export type CodeGraph = {
  files: ScannedFile[];
  modules: string[];
  /** Aristas modulo -> modulo con conteo de dependencias. */
  moduleEdges: { from: string; to: string; weight: number }[];
};

const IMPORT_RE =
  /(?:import\b[^'"]*?from\s*|export\b[^'"]*?from\s*|import\s*|require\s*\()\s*['"]([^'"]+)['"]/g;

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function extractImportSpecifiers(source: string): string[] {
  const specifiers = new Set<string>();
  for (const match of source.matchAll(IMPORT_RE)) {
    const spec = match[1]?.trim();
    if (spec) specifiers.add(spec);
  }
  return [...specifiers];
}

/** Resuelve un especificador a una ruta de archivo relativa del repo, o null. */
async function resolveSpecifier(
  specifier: string,
  fromFileAbs: string,
): Promise<string | null> {
  let baseAbs: string | null = null;

  if (specifier.startsWith("@/")) {
    baseAbs = path.join(ROOT, specifier.slice(2));
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    baseAbs = path.resolve(path.dirname(fromFileAbs), specifier);
  } else {
    return null; // paquete externo
  }

  // Coincidencia directa con extension.
  if (RESOLVE_EXTENSIONS.some((ext) => baseAbs!.endsWith(ext))) {
    if (await pathExists(baseAbs)) return toPosix(path.relative(ROOT, baseAbs));
  }

  // Probar agregando extensiones.
  for (const ext of RESOLVE_EXTENSIONS) {
    const candidate = `${baseAbs}${ext}`;
    if (await pathExists(candidate)) {
      return toPosix(path.relative(ROOT, candidate));
    }
  }

  // Probar como directorio con index.
  for (const ext of RESOLVE_EXTENSIONS) {
    const candidate = path.join(baseAbs, `index${ext}`);
    if (await pathExists(candidate)) {
      return toPosix(path.relative(ROOT, candidate));
    }
  }

  return null;
}

async function walkDir(dirAbs: string, acc: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dirAbs, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dirAbs, entry.name);

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      await walkDir(fullPath, acc);
    } else if (
      entry.isFile() &&
      SCAN_EXTENSIONS.some((ext) => entry.name.endsWith(ext))
    ) {
      acc.push(fullPath);
    }
  }
}

/**
 * Escanea el repositorio y construye el grafo de codigo (archivos, modulos y
 * dependencias). 100% deterministico: no usa LLM.
 */
export async function scanCodeGraph(): Promise<CodeGraph> {
  const fileAbsPaths: string[] = [];
  for (const dir of SCAN_DIRS) {
    await walkDir(path.join(ROOT, dir), fileAbsPaths);
  }

  const files: ScannedFile[] = [];
  const moduleSet = new Set<string>();

  for (const abs of fileAbsPaths) {
    const rel = toPosix(path.relative(ROOT, abs));
    const source = await readFile(abs, "utf-8");
    const specifiers = extractImportSpecifiers(source);

    const imports: string[] = [];
    const externalImports: string[] = [];
    for (const spec of specifiers) {
      const resolved = await resolveSpecifier(spec, abs);
      if (resolved && resolved !== rel) {
        imports.push(resolved);
      } else if (!resolved && !spec.startsWith(".") && !spec.startsWith("@/")) {
        externalImports.push(spec);
      }
    }

    const moduleDir = toPosix(path.dirname(rel));
    moduleSet.add(moduleDir);

    files.push({
      path: rel,
      module: moduleDir,
      ext: path.extname(rel),
      loc: source.split("\n").length,
      imports: [...new Set(imports)],
      externalImports: [...new Set(externalImports)],
    });
  }

  // Aristas modulo -> modulo agregadas a partir de imports entre archivos.
  const fileToModule = new Map(files.map((f) => [f.path, f.module]));
  const moduleEdgeCounts = new Map<string, number>();
  for (const file of files) {
    for (const imp of file.imports) {
      const targetModule = fileToModule.get(imp);
      if (!targetModule || targetModule === file.module) continue;
      const key = `${file.module}\u0000${targetModule}`;
      moduleEdgeCounts.set(key, (moduleEdgeCounts.get(key) ?? 0) + 1);
    }
  }

  const moduleEdges = [...moduleEdgeCounts.entries()].map(([key, weight]) => {
    const [from, to] = key.split("\u0000");
    return { from, to, weight };
  });

  return {
    files,
    modules: [...moduleSet].sort(),
    moduleEdges,
  };
}
