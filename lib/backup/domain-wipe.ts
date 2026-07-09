import fs from "node:fs";
import path from "node:path";

import {
  getExportDomain,
  filterFilesForDomains,
  type ExportDomainId,
} from "@/lib/backup/domains";
import { getDataRoot, getUploadDir } from "@/lib/runtime-paths";

async function removePathIfExists(targetPath: string): Promise<void> {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  const stat = await fs.promises.stat(targetPath);
  if (stat.isDirectory()) {
    await fs.promises.rm(targetPath, { recursive: true, force: true });
    return;
  }

  await fs.promises.unlink(targetPath);
}

async function removeDirectoryContents(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await fs.promises.rm(entryPath, { recursive: true, force: true });
        return;
      }

      await fs.promises.unlink(entryPath);
    }),
  );
}

export async function wipeDomainFilesystem(
  domainIds: ExportDomainId[],
): Promise<void> {
  const dataRoot = getDataRoot();
  const uploadRoot = getUploadDir();

  for (const domainId of domainIds) {
    const domain = getExportDomain(domainId);

    for (const dataPath of domain.dataPaths) {
      const relative = dataPath.replace(/^data\//, "");
      const absolute = path.join(dataRoot, relative);

      if (domain.excludeDataPaths?.length) {
        if (!fs.existsSync(absolute)) {
          continue;
        }

        const entries = await fs.promises.readdir(absolute, {
          withFileTypes: true,
        });

        for (const entry of entries) {
          const entryRelative = `data/${relative}/${entry.name}`.replace(
            /\\/g,
            "/",
          );
          const excluded = domain.excludeDataPaths.some((exclude) => {
            const withSlash = exclude.endsWith("/") ? exclude : `${exclude}/`;
            return (
              entryRelative === exclude || entryRelative.startsWith(withSlash)
            );
          });

          if (excluded) {
            continue;
          }

          await removePathIfExists(path.join(absolute, entry.name));
        }

        continue;
      }

      await removeDirectoryContents(absolute);
    }

    for (const uploadPath of domain.uploadPaths ?? []) {
      const relative = uploadPath.replace(/^uploads\//, "");
      const absolute = path.join(uploadRoot, relative);
      await removeDirectoryContents(absolute);
    }
  }
}
