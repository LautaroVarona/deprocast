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
import {
  assertLocalBackupAllowed,
  assertNoActiveProcessing,
  BackupGuardError,
} from "@/lib/backup/guards";
import {
  parseBackupManifest,
  parseChecksum,
  type BackupManifest,
} from "@/lib/backup/manifest";
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

type ValidatedBackup = {
  manifest: BackupManifest;
  tempDir: string;
  databasePath: string;
  dataFiles: BackupFileEntry[];
  uploadFiles: BackupFileEntry[];
};

export type RestoreBackupResult = {
  success: true;
  restoredAt: string;
  stats: BackupManifest["stats"];
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

export async function restoreBackupFromZip(
  zipBuffer: Buffer,
): Promise<RestoreBackupResult> {
  assertLocalBackupAllowed();
  await assertNoActiveProcessing();
  await disconnectPrismaClient();

  let tempDir: string | null = null;

  try {
    tempDir = await extractZipToTemp(zipBuffer);
    const validated = await validateBackupContents(tempDir);

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

    return {
      success: true,
      restoredAt,
      stats: validated.manifest.stats,
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
): Promise<BackupManifest> {
  assertLocalBackupAllowed();

  let tempDir: string | null = null;

  try {
    tempDir = await extractZipToTemp(zipBuffer);
    const validated = await validateBackupContents(tempDir);
    return validated.manifest;
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir).catch(() => undefined);
    }
  }
}
