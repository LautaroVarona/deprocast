import fs from "node:fs";

import {
  fileBelongsToDomain,
  getAllExportDomains,
  mergeTableSpecsForDomains,
  type DomainPreviewStat,
} from "@/lib/backup/domains";
import { countRowsForSpecs } from "@/lib/backup/partial-database";
import { collectFilesRecursively } from "@/lib/backup/paths";
import {
  getDataRoot,
  getDatabaseFilePath,
  getUploadDir,
} from "@/lib/runtime-paths";
import { ensureRuntimeReady } from "@/lib/runtime-setup";

export async function getDomainPreviewStats(): Promise<DomainPreviewStat[]> {
  await ensureRuntimeReady();

  const dbPath = getDatabaseFilePath();
  const dataFiles = await collectFilesRecursively(getDataRoot(), "data");
  const uploadFiles = await collectFilesRecursively(getUploadDir(), "uploads");

  return getAllExportDomains().map((domain) => {
    const domainDataFiles = dataFiles.filter((file) =>
      fileBelongsToDomain(file.relativePath, domain),
    );
    const domainUploadFiles = uploadFiles.filter((file) =>
      fileBelongsToDomain(file.relativePath, domain),
    );
    const allFiles = [...domainDataFiles, ...domainUploadFiles];
    const specs = mergeTableSpecsForDomains([domain.id]);

    return {
      id: domain.id,
      label: domain.label,
      description: domain.description,
      group: domain.group,
      clientOnly: domain.clientOnly ?? false,
      fileCount: allFiles.length,
      totalBytes: allFiles.reduce((sum, file) => sum + file.sizeBytes, 0),
      rowCount: domain.clientOnly
        ? 0
        : countRowsForSpecs(dbPath, specs),
    };
  });
}

export function readBrowserPreferencesFromBackupDir(
  tempDir: string,
): Record<string, unknown> | null {
  const preferencesPath = `${tempDir}/browser-preferences.json`;
  if (!fs.existsSync(preferencesPath)) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(preferencesPath, "utf8"),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}
