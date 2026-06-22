import fs from "node:fs";
import path from "node:path";

const EXCLUDED_BASENAMES = new Set([
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
]);

const EXCLUDED_EXTENSIONS = new Set([".tmp", ".db-journal"]);

export type BackupFileEntry = {
  relativePath: string;
  absolutePath: string;
  sizeBytes: number;
};

function shouldExcludeFile(fileName: string): boolean {
  if (EXCLUDED_BASENAMES.has(fileName)) {
    return true;
  }

  const extension = path.extname(fileName).toLowerCase();
  return EXCLUDED_EXTENSIONS.has(extension);
}

export async function collectFilesRecursively(
  rootDir: string,
  pathPrefix: string,
): Promise<BackupFileEntry[]> {
  const entries: BackupFileEntry[] = [];

  async function walk(currentDir: string, relativePrefix: string): Promise<void> {
    let dirEntries: fs.Dirent[];

    try {
      dirEntries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }

      throw error;
    }

    for (const entry of dirEntries) {
      if (shouldExcludeFile(entry.name)) {
        continue;
      }

      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = relativePrefix
        ? `${relativePrefix}/${entry.name}`
        : entry.name;

      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const stat = await fs.promises.stat(absolutePath);
      entries.push({
        relativePath: pathPrefix
          ? `${pathPrefix}/${relativePath}`.replace(/\\/g, "/")
          : relativePath.replace(/\\/g, "/"),
        absolutePath,
        sizeBytes: stat.size,
      });
    }
  }

  await walk(rootDir, "");
  entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return entries;
}
