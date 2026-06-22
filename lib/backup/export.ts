import fs from "node:fs";

import JSZip from "jszip";

import { sha256Buffer, sha256Tree } from "@/lib/backup/checksums";
import {
  BACKUP_DATA_PREFIX,
  BACKUP_DATABASE_FILENAME,
  BACKUP_FORMAT_VERSION,
  BACKUP_MANIFEST_FILENAME,
  BACKUP_UPLOADS_PREFIX,
  CURRENT_SCHEMA_MIGRATION,
} from "@/lib/backup/constants";
import {
  assertLocalBackupAllowed,
  assertNoActiveProcessing,
} from "@/lib/backup/guards";
import { formatChecksum, type BackupManifest } from "@/lib/backup/manifest";
import { collectFilesRecursively } from "@/lib/backup/paths";
import { disconnectPrismaClient } from "@/lib/prisma";
import {
  getDataRoot,
  getDatabaseFilePath,
  getUploadDir,
} from "@/lib/runtime-paths";
import { ensureRuntimeReady } from "@/lib/runtime-setup";

import packageJson from "../../package.json";

async function snapshotDatabase(): Promise<Buffer> {
  await disconnectPrismaClient();

  const dbPath = getDatabaseFilePath();
  if (!fs.existsSync(dbPath)) {
    throw new Error("No se encontró la base de datos local.");
  }

  const buffer = await fs.promises.readFile(dbPath);

  return buffer;
}

function buildManifest(params: {
  databaseBytes: number;
  dataFileCount: number;
  uploadFileCount: number;
  totalBytes: number;
  databaseChecksum: string;
  dataTreeChecksum: string;
  uploadsTreeChecksum: string;
}): BackupManifest {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: packageJson.version,
    schemaMigration: CURRENT_SCHEMA_MIGRATION,
    createdAt: new Date().toISOString(),
    platform: "local",
    stats: {
      databaseBytes: params.databaseBytes,
      dataFileCount: params.dataFileCount,
      uploadFileCount: params.uploadFileCount,
      totalBytes: params.totalBytes,
    },
    checksums: {
      database: formatChecksum(params.databaseChecksum),
      dataTree: formatChecksum(params.dataTreeChecksum),
      uploadsTree: formatChecksum(params.uploadsTreeChecksum),
    },
  };
}

export async function buildBackupArchive(): Promise<Buffer> {
  assertLocalBackupAllowed();
  await assertNoActiveProcessing();
  await ensureRuntimeReady();

  const databaseBuffer = await snapshotDatabase();
  const databaseChecksum = await sha256Buffer(databaseBuffer);

  const dataFiles = await collectFilesRecursively(
    getDataRoot(),
    BACKUP_DATA_PREFIX.replace(/\/$/, ""),
  );
  const uploadFiles = await collectFilesRecursively(
    getUploadDir(),
    BACKUP_UPLOADS_PREFIX.replace(/\/$/, ""),
  );

  const dataTreeChecksum = await sha256Tree(dataFiles);
  const uploadsTreeChecksum = await sha256Tree(uploadFiles);

  const dataBytes = dataFiles.reduce((sum, file) => sum + file.sizeBytes, 0);
  const uploadBytes = uploadFiles.reduce((sum, file) => sum + file.sizeBytes, 0);
  const totalBytes = databaseBuffer.length + dataBytes + uploadBytes;

  const manifest = buildManifest({
    databaseBytes: databaseBuffer.length,
    dataFileCount: dataFiles.length,
    uploadFileCount: uploadFiles.length,
    totalBytes,
    databaseChecksum,
    dataTreeChecksum,
    uploadsTreeChecksum,
  });

  const zip = new JSZip();
  zip.file(BACKUP_MANIFEST_FILENAME, JSON.stringify(manifest, null, 2));
  zip.file(BACKUP_DATABASE_FILENAME, databaseBuffer);

  for (const file of dataFiles) {
    const zipPath = file.relativePath.replace(/\\/g, "/");
    const content = await fs.promises.readFile(file.absolutePath);
    zip.file(zipPath, content);
  }

  for (const file of uploadFiles) {
    const zipPath = file.relativePath.replace(/\\/g, "/");
    const content = await fs.promises.readFile(file.absolutePath);
    zip.file(zipPath, content);
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export function buildBackupFilename(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(":", "");
  return `deprocast-backup-${date}-${time}.deprocast-backup.zip`;
}
