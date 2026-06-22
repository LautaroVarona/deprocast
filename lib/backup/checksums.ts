import crypto from "node:crypto";
import fs from "node:fs";

import type { BackupFileEntry } from "@/lib/backup/paths";

export async function sha256Buffer(buffer: Buffer): Promise<string> {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function sha256File(filePath: string): Promise<string> {
  const buffer = await fs.promises.readFile(filePath);
  return sha256Buffer(buffer);
}

/** Hash determinista de un árbol de archivos (ruta relativa + contenido). */
export async function sha256Tree(files: BackupFileEntry[]): Promise<string> {
  const hash = crypto.createHash("sha256");

  for (const file of files) {
    hash.update(file.relativePath);
    hash.update("\0");
    const content = await fs.promises.readFile(file.absolutePath);
    hash.update(content);
    hash.update("\0");
  }

  return hash.digest("hex");
}
