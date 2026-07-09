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
  BACKUP_BROWSER_PREFERENCES_FILENAME,
  EXPORT_DOMAIN_IDS,
  filterFilesForDomains,
  parseExportDomainIds,
  type ExportDomainId,
} from "@/lib/backup/domains";
import {
  assertLocalBackupAllowed,
  assertNoActiveProcessing,
} from "@/lib/backup/guards";
import { formatChecksum, type BackupManifest } from "@/lib/backup/manifest";
import { buildPartialDatabaseBuffer } from "@/lib/backup/partial-database";
import { collectFilesRecursively } from "@/lib/backup/paths";
import { disconnectPrismaClient } from "@/lib/prisma";
import {
  getDataRoot,
  getDatabaseFilePath,
  getUploadDir,
} from "@/lib/runtime-paths";
import { ensureRuntimeReady } from "@/lib/runtime-setup";

import packageJson from "../../package.json";

export type BuildBackupArchiveOptions = {
  domains?: ExportDomainId[];
  browserPreferences?: Record<string, unknown>;
};

async function snapshotDatabase(): Promise<Buffer> {
  await disconnectPrismaClient();

  const dbPath = getDatabaseFilePath();
  if (!fs.existsSync(dbPath)) {
    throw new Error("No se encontró la base de datos local.");
  }

  return fs.promises.readFile(dbPath);
}

function buildManifest(params: {
  exportMode: BackupManifest["exportMode"];
  includedDomains?: ExportDomainId[];
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
    exportMode: params.exportMode,
    includedDomains: params.includedDomains,
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

function isFullDomainSelection(domains: ExportDomainId[]): boolean {
  if (domains.includes("preferences")) {
    return false;
  }

  const serverDomains = EXPORT_DOMAIN_IDS.filter((id) => id !== "preferences");
  if (domains.length !== serverDomains.length) {
    return false;
  }

  const selected = new Set(domains);
  return serverDomains.every((id) => selected.has(id));
}

export async function buildBackupArchive(
  options: BuildBackupArchiveOptions = {},
): Promise<Buffer> {
  assertLocalBackupAllowed();
  await assertNoActiveProcessing();
  await ensureRuntimeReady();

  const requestedDomains = options.domains
    ? parseExportDomainIds(options.domains)
    : undefined;

  const isPartial =
    requestedDomains !== undefined && !isFullDomainSelection(requestedDomains);

  if (!isPartial) {
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
    const uploadBytes = uploadFiles.reduce(
      (sum, file) => sum + file.sizeBytes,
      0,
    );
    const totalBytes = databaseBuffer.length + dataBytes + uploadBytes;

    const manifest = buildManifest({
      exportMode: "full",
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

  const domains = requestedDomains;
  const dbPath = getDatabaseFilePath();
  const databaseBuffer = await buildPartialDatabaseBuffer(dbPath, domains);
  const databaseChecksum = await sha256Buffer(databaseBuffer);

  const allDataFiles = await collectFilesRecursively(
    getDataRoot(),
    BACKUP_DATA_PREFIX.replace(/\/$/, ""),
  );
  const allUploadFiles = await collectFilesRecursively(
    getUploadDir(),
    BACKUP_UPLOADS_PREFIX.replace(/\/$/, ""),
  );

  const dataFiles = filterFilesForDomains(allDataFiles, domains);
  const uploadFiles = filterFilesForDomains(allUploadFiles, domains);

  const dataTreeChecksum = await sha256Tree(dataFiles);
  const uploadsTreeChecksum = await sha256Tree(uploadFiles);

  const dataBytes = dataFiles.reduce((sum, file) => sum + file.sizeBytes, 0);
  const uploadBytes = uploadFiles.reduce((sum, file) => sum + file.sizeBytes, 0);
  let totalBytes = databaseBuffer.length + dataBytes + uploadBytes;

  const zip = new JSZip();
  const manifest = buildManifest({
    exportMode: "partial",
    includedDomains: domains,
    databaseBytes: databaseBuffer.length,
    dataFileCount: dataFiles.length,
    uploadFileCount: uploadFiles.length,
    totalBytes,
    databaseChecksum,
    dataTreeChecksum,
    uploadsTreeChecksum,
  });

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

  if (
    domains.includes("preferences") &&
    options.browserPreferences &&
    Object.keys(options.browserPreferences).length > 0
  ) {
    const preferencesJson = JSON.stringify(options.browserPreferences, null, 2);
    zip.file(BACKUP_BROWSER_PREFERENCES_FILENAME, preferencesJson);
    totalBytes += Buffer.byteLength(preferencesJson, "utf8");
    manifest.stats.totalBytes = totalBytes;
    zip.file(BACKUP_MANIFEST_FILENAME, JSON.stringify(manifest, null, 2));
  }

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export function buildBackupFilename(domains?: ExportDomainId[]): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(":", "");

  if (!domains || domains.length === 0) {
    return `deprocast-backup-${date}-${time}.deprocast-backup.zip`;
  }

  const slug = domains.slice(0, 4).join("-");
  const suffix = domains.length > 4 ? `-and-${domains.length - 4}-more` : "";
  return `deprocast-backup-partial-${slug}${suffix}-${date}-${time}.deprocast-backup.zip`;
}
