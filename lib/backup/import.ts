import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import JSZip from "jszip";
import { ZodError } from "zod";

import { sha256Buffer, sha256Tree } from "@/lib/backup/checksums";
import {
  BACKUP_DATA_PREFIX,
  BACKUP_DATABASE_FILENAME,
  BACKUP_MANIFEST_FILENAME,
  BACKUP_UPLOADS_PREFIX,
} from "@/lib/backup/constants";
import { wipeDomainFilesystem } from "@/lib/backup/domain-wipe";
import {
  filterFilesForDomains,
  parseExportDomainIds,
  type ExportDomainId,
} from "@/lib/backup/domains";
import {
  assertLocalBackupAllowed,
  assertNoActiveProcessing,
  BackupGuardError,
} from "@/lib/backup/guards";
import {
  isPartialBackupManifest,
  parseBackupManifest,
  parseChecksum,
  type BackupManifest,
} from "@/lib/backup/manifest";
import { mergePartialDatabaseIntoLive } from "@/lib/backup/partial-database";
import { readBrowserPreferencesFromBackupDir } from "@/lib/backup/preview";
import { collectFilesRecursively, type BackupFileEntry } from "@/lib/backup/paths";
import { wipeCurrentState } from "@/lib/backup/wipe";
import { disconnectPrismaClient, getPrismaClient } from "@/lib/prisma";
import {
  getDataRoot,
  getDatabaseFilePath,
  getUploadDir,
} from "@/lib/runtime-paths";
import {
  databaseHasAppSchema,
  ensureRuntimeReady,
} from "@/lib/runtime-setup";
import { logBackupImportedActivity } from "@/lib/historial/domain-log";

type ValidatedBackup = {
  manifest: BackupManifest;
  tempDir: string;
  databasePath: string;
  dataFiles: BackupFileEntry[];
  uploadFiles: BackupFileEntry[];
  browserPreferences: Record<string, unknown> | null;
};

export type RestoreBackupResult = {
  success: true;
  restoredAt: string;
  stats: BackupManifest["stats"];
  exportMode: BackupManifest["exportMode"];
  restoredDomains?: ExportDomainId[];
  browserPreferences?: Record<string, unknown> | null;
};

export type ValidateBackupResult = {
  manifest: BackupManifest;
  includedDomains: ExportDomainId[];
  browserPreferences: Record<string, unknown> | null;
};

export type RestoreBackupOptions = {
  domains?: ExportDomainId[];
};

async function extractZipToTemp(zipBuffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "deprocast-restore-"),
  );

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);

  for (const entry of entries) {
    const normalizedName = entry.name.replace(/\\/g, "/");
    const targetPath = path.join(tempDir, normalizedName);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    const content = await entry.async("nodebuffer");
    await fs.promises.writeFile(targetPath, content);
  }

  return tempDir;
}

async function validateBackupContents(
  tempDir: string,
): Promise<Omit<ValidatedBackup, "tempDir">> {
  const manifestPath = path.join(tempDir, BACKUP_MANIFEST_FILENAME);
  if (!fs.existsSync(manifestPath)) {
    throw new BackupGuardError(
      "El archivo no contiene manifest.json.",
      400,
    );
  }

  let manifest: BackupManifest;
  try {
    const raw = JSON.parse(
      await fs.promises.readFile(manifestPath, "utf8"),
    ) as unknown;
    manifest = parseBackupManifest(raw);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BackupGuardError(
        `El manifest no es válido para esta versión de Deprocast: ${error.issues.map((issue) => issue.message).join("; ")}`,
        400,
      );
    }

    throw new BackupGuardError("No se pudo leer manifest.json.", 400);
  }

  const databasePath = path.join(tempDir, BACKUP_DATABASE_FILENAME);
  if (!fs.existsSync(databasePath)) {
    throw new BackupGuardError(
      "El archivo no contiene database.sqlite.",
      400,
    );
  }

  if (!databaseHasAppSchema(databasePath)) {
    throw new BackupGuardError(
      "database.sqlite no contiene el esquema de Deprocast.",
      400,
    );
  }

  const dataRoot = path.join(tempDir, BACKUP_DATA_PREFIX.replace(/\/$/, ""));
  const uploadsRoot = path.join(
    tempDir,
    BACKUP_UPLOADS_PREFIX.replace(/\/$/, ""),
  );

  const dataFiles = await collectFilesRecursively(
    dataRoot,
    BACKUP_DATA_PREFIX.replace(/\/$/, ""),
  );
  const uploadFiles = await collectFilesRecursively(
    uploadsRoot,
    BACKUP_UPLOADS_PREFIX.replace(/\/$/, ""),
  );

  const databaseBuffer = await fs.promises.readFile(databasePath);
  const databaseChecksum = await sha256Buffer(databaseBuffer);
  const dataTreeChecksum = await sha256Tree(dataFiles);
  const uploadsTreeChecksum = await sha256Tree(uploadFiles);

  if (databaseChecksum !== parseChecksum(manifest.checksums.database)) {
    throw new BackupGuardError(
      "Checksum de database.sqlite no coincide con el manifest.",
      400,
    );
  }

  if (dataTreeChecksum !== parseChecksum(manifest.checksums.dataTree)) {
    throw new BackupGuardError(
      "Checksum del árbol data/ no coincide con el manifest.",
      400,
    );
  }

  if (uploadsTreeChecksum !== parseChecksum(manifest.checksums.uploadsTree)) {
    throw new BackupGuardError(
      "Checksum del árbol uploads/ no coincide con el manifest.",
      400,
    );
  }

  return {
    manifest,
    databasePath,
    dataFiles,
    uploadFiles,
    browserPreferences: readBrowserPreferencesFromBackupDir(tempDir),
  };
}

async function copyTreeFiles(
  files: BackupFileEntry[],
  stripPrefix: string,
  targetRoot: string,
): Promise<void> {
  for (const file of files) {
    const relativeWithoutPrefix = file.relativePath.startsWith(`${stripPrefix}/`)
      ? file.relativePath.slice(stripPrefix.length + 1)
      : file.relativePath;

    const targetPath = path.join(targetRoot, relativeWithoutPrefix);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.copyFile(file.absolutePath, targetPath);
  }
}

async function cleanupTempDir(tempDir: string): Promise<void> {
  await fs.promises.rm(tempDir, { recursive: true, force: true });
}

function resolveRestoreDomains(
  manifest: BackupManifest,
  requestedDomains?: ExportDomainId[],
): ExportDomainId[] {
  if (!isPartialBackupManifest(manifest)) {
    return [];
  }

  const included = manifest.includedDomains ?? [];
  if (!requestedDomains || requestedDomains.length === 0) {
    throw new BackupGuardError(
      "La copia parcial requiere indicar qué dominios restaurar.",
      400,
    );
  }

  const selected = parseExportDomainIds(requestedDomains);
  const includedSet = new Set(included);
  const invalid = selected.filter((domain) => !includedSet.has(domain));

  if (invalid.length > 0) {
    throw new BackupGuardError(
      `Dominios no presentes en la copia: ${invalid.join(", ")}.`,
      400,
    );
  }

  return selected;
}

export async function restoreBackupFromZip(
  zipBuffer: Buffer,
  options: RestoreBackupOptions = {},
): Promise<RestoreBackupResult> {
  assertLocalBackupAllowed();
  await assertNoActiveProcessing();
  await disconnectPrismaClient();

  let tempDir: string | null = null;

  try {
    tempDir = await extractZipToTemp(zipBuffer);
    const validated = await validateBackupContents(tempDir);
    const isPartial = isPartialBackupManifest(validated.manifest);

    if (!isPartial) {
      await wipeCurrentState();

      const targetDbPath = getDatabaseFilePath();
      await fs.promises.mkdir(path.dirname(targetDbPath), { recursive: true });
      await fs.promises.copyFile(validated.databasePath, targetDbPath);

      await copyTreeFiles(
        validated.dataFiles,
        BACKUP_DATA_PREFIX.replace(/\/$/, ""),
        getDataRoot(),
      );
      await copyTreeFiles(
        validated.uploadFiles,
        BACKUP_UPLOADS_PREFIX.replace(/\/$/, ""),
        getUploadDir(),
      );

      await ensureRuntimeReady();
      await disconnectPrismaClient();
      getPrismaClient();

      if (!databaseHasAppSchema(getDatabaseFilePath())) {
        throw new BackupGuardError(
          "La restauración falló: la base de datos resultante no es válida.",
          500,
        );
      }

      const restoredAt = new Date().toISOString();
      await cleanupTempDir(tempDir);
      tempDir = null;

      void logBackupImportedActivity({
        restoredAt,
        exportMode: "full",
        stats: validated.manifest.stats,
      }).catch((error) => {
        console.error("Historial backup import log error:", error);
      });

      return {
        success: true,
        restoredAt,
        stats: validated.manifest.stats,
        exportMode: "full",
      };
    }

    const restoreDomains = resolveRestoreDomains(
      validated.manifest,
      options.domains,
    );

    await wipeDomainFilesystem(restoreDomains);

    const targetDbPath = getDatabaseFilePath();
    await fs.promises.mkdir(path.dirname(targetDbPath), { recursive: true });

    mergePartialDatabaseIntoLive(
      targetDbPath,
      validated.databasePath,
      restoreDomains,
    );

    const dataFiles = filterFilesForDomains(
      validated.dataFiles,
      restoreDomains,
    );
    const uploadFiles = filterFilesForDomains(
      validated.uploadFiles,
      restoreDomains,
    );

    await copyTreeFiles(
      dataFiles,
      BACKUP_DATA_PREFIX.replace(/\/$/, ""),
      getDataRoot(),
    );
    await copyTreeFiles(
      uploadFiles,
      BACKUP_UPLOADS_PREFIX.replace(/\/$/, ""),
      getUploadDir(),
    );

    await ensureRuntimeReady();
    await disconnectPrismaClient();
    getPrismaClient();

    if (!databaseHasAppSchema(getDatabaseFilePath())) {
      throw new BackupGuardError(
        "La restauración parcial falló: la base de datos resultante no es válida.",
        500,
      );
    }

    const restoredAt = new Date().toISOString();
    await cleanupTempDir(tempDir);
    tempDir = null;

    void logBackupImportedActivity({
      restoredAt,
      exportMode: "partial",
      stats: validated.manifest.stats,
      restoredDomains: restoreDomains,
    }).catch((error) => {
      console.error("Historial backup import log error:", error);
    });

    return {
      success: true,
      restoredAt,
      stats: validated.manifest.stats,
      exportMode: "partial",
      restoredDomains: restoreDomains,
      browserPreferences: restoreDomains.includes("preferences")
        ? validated.browserPreferences
        : null,
    };
  } catch (error) {
    if (tempDir) {
      await cleanupTempDir(tempDir).catch(() => undefined);
    }

    throw error;
  }
}

export async function validateBackupZip(
  zipBuffer: Buffer,
): Promise<ValidateBackupResult> {
  assertLocalBackupAllowed();

  let tempDir: string | null = null;

  try {
    tempDir = await extractZipToTemp(zipBuffer);
    const validated = await validateBackupContents(tempDir);

    return {
      manifest: validated.manifest,
      includedDomains: validated.manifest.includedDomains ?? [],
      browserPreferences: validated.browserPreferences,
    };
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir).catch(() => undefined);
    }
  }
}
