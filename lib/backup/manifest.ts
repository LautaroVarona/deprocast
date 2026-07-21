import { z } from "zod";

import {
  BACKUP_FORMAT_VERSION,
} from "@/lib/backup/constants";
import { exportDomainIdSchema } from "@/lib/backup/domains";

export const backupManifestStatsSchema = z.object({
  databaseBytes: z.number().int().nonnegative(),
  dataFileCount: z.number().int().nonnegative(),
  uploadFileCount: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
});

export const backupManifestChecksumsSchema = z.object({
  database: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  dataTree: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  uploadsTree: z.string().regex(/^sha256:[a-f0-9]{64}$/),
});

export const backupExportModeSchema = z.enum(["full", "partial"]);

export const backupManifestSchema = z.object({
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  appVersion: z.string().min(1),
  schemaMigration: z
    .string()
    .regex(/^\d{14}_[a-z0-9_]+$/, "schemaMigration debe ser un nombre de migración Prisma"),
  createdAt: z.string().datetime(),
  platform: z.enum(["local", "vercel"]),
  exportMode: backupExportModeSchema.default("full"),
  includedDomains: z.array(exportDomainIdSchema).optional(),
  stats: backupManifestStatsSchema,
  checksums: backupManifestChecksumsSchema,
});

export type BackupManifest = z.infer<typeof backupManifestSchema>;
export type BackupExportMode = z.infer<typeof backupExportModeSchema>;

export function parseBackupManifest(raw: unknown): BackupManifest {
  return backupManifestSchema.parse(raw);
}

export function isPartialBackupManifest(manifest: BackupManifest): boolean {
  return manifest.exportMode === "partial";
}

export function formatChecksum(hex: string): string {
  return `sha256:${hex}`;
}

export function parseChecksum(formatted: string): string {
  const match = formatted.match(/^sha256:([a-f0-9]{64})$/);
  if (!match) {
    throw new Error(`Checksum inválido: ${formatted}`);
  }

  return match[1];
}
