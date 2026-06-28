import path from "node:path";

import type {
  AudioAssetSummary,
  DeduplicateScanResult,
  DuplicateGroup,
  DuplicateMember,
  DuplicateReason,
} from "@/lib/audio-station/types";

type AssetInput = {
  id: string;
  filename: string;
  status: string;
  originalCreatedAt: Date | string;
  transcript: { id: string } | null;
};

const COPY_SUFFIX_PATTERN =
  /\s*(?:\((\d+)\)|\[(\d+)\]|-\s*copia(?:\s*\((\d+)\))?|\s+copy(?:\s*\((\d+)\))?|_(\d+))\s*$/i;

function parseCopyIndex(filename: string): number | null {
  const base = path.basename(filename, path.extname(filename));
  const match = base.match(COPY_SUFFIX_PATTERN);
  if (!match) return null;

  for (let index = 1; index < match.length; index += 1) {
    const value = match[index];
    if (value) return Number.parseInt(value, 10);
  }

  return 1;
}

function stripCopySuffix(filename: string): string {
  const extension = path.extname(filename);
  const base = path.basename(filename, extension);
  const stripped = base.replace(COPY_SUFFIX_PATTERN, "").trim();
  return `${stripped}${extension}`;
}

function normalizeBasename(filename: string): string {
  return stripCopySuffix(filename)
    .replace(/[^\w\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractNumberKeys(filename: string): string[] {
  const base = path.basename(filename, path.extname(filename));
  const matches = base.match(/\d{4,}/g) ?? [];
  return [...new Set(matches)];
}

function toMember(asset: AssetInput): DuplicateMember {
  const copyIndex = parseCopyIndex(asset.filename);

  return {
    id: asset.id,
    filename: asset.filename,
    status: asset.status,
    originalCreatedAt:
      asset.originalCreatedAt instanceof Date
        ? asset.originalCreatedAt.toISOString()
        : asset.originalCreatedAt,
    hasTranscript: Boolean(asset.transcript),
    isCopySuffix: copyIndex !== null,
    copyIndex,
  };
}

function scoreCanonical(member: DuplicateMember): number {
  let score = 0;

  if (member.hasTranscript) score += 100;
  if (member.status === "COMPLETED") score += 50;
  if (!member.isCopySuffix) score += 20;
  if (member.copyIndex !== null) score -= member.copyIndex;

  const ageMs = Date.now() - new Date(member.originalCreatedAt).getTime();
  score -= ageMs / 1_000_000_000;

  return score;
}

function pickCanonical(members: DuplicateMember[]): DuplicateMember {
  return [...members].sort((a, b) => scoreCanonical(b) - scoreCanonical(a))[0];
}

function buildGroup(
  reason: DuplicateReason,
  normalizedKey: string,
  members: DuplicateMember[],
): DuplicateGroup | null {
  if (members.length < 2) return null;

  const canonical = pickCanonical(members);
  const duplicateIds = members
    .filter((member) => member.id !== canonical.id)
    .map((member) => member.id);

  return {
    id: `${reason}:${normalizedKey}`,
    reason,
    normalizedKey,
    keepId: canonical.id,
    members,
    duplicateIds,
  };
}

export function scanForDuplicates(assets: AssetInput[]): DeduplicateScanResult {
  const membersById = new Map<string, DuplicateMember>();
  for (const asset of assets) {
    membersById.set(asset.id, toMember(asset));
  }

  const groups: DuplicateGroup[] = [];
  const groupedIds = new Set<string>();

  const byNormalized = new Map<string, DuplicateMember[]>();
  for (const asset of assets) {
    const key = normalizeBasename(asset.filename);
    const bucket = byNormalized.get(key) ?? [];
    bucket.push(membersById.get(asset.id)!);
    byNormalized.set(key, bucket);
  }

  for (const [key, members] of byNormalized) {
    const group = buildGroup("normalized_name", key, members);
    if (!group) continue;
    groups.push(group);
    for (const member of group.members) groupedIds.add(member.id);
  }

  const byNumber = new Map<string, DuplicateMember[]>();
  for (const asset of assets) {
    for (const numberKey of extractNumberKeys(asset.filename)) {
      const bucket = byNumber.get(numberKey) ?? [];
      bucket.push(membersById.get(asset.id)!);
      byNumber.set(numberKey, bucket);
    }
  }

  for (const [numberKey, members] of byNumber) {
    const uniqueMembers = [
      ...new Map(members.map((member) => [member.id, member])).values(),
    ];
    if (uniqueMembers.length < 2) continue;

    const normalizedKeys = new Set(
      uniqueMembers.map((member) => normalizeBasename(member.filename)),
    );
    if (normalizedKeys.size === 1) continue;

    const hasCopyPattern = uniqueMembers.some((member) => member.isCopySuffix);
    if (!hasCopyPattern) continue;

    const group = buildGroup("number_collision", numberKey, uniqueMembers);
    if (!group) continue;

    const alreadyCovered = group.duplicateIds.every((id) => groupedIds.has(id));
    if (alreadyCovered) continue;

    groups.push(group);
    for (const member of group.members) groupedIds.add(member.id);
  }

  const copySuffixGroups = new Map<string, DuplicateMember[]>();
  for (const asset of assets) {
    if (parseCopyIndex(asset.filename) === null) continue;
    const key = normalizeBasename(asset.filename);
    const bucket = copySuffixGroups.get(key) ?? [];
    bucket.push(membersById.get(asset.id)!);
    copySuffixGroups.set(key, bucket);
  }

  for (const [key, members] of copySuffixGroups) {
    const originals = byNormalized.get(key) ?? [];
    const combined = [
      ...new Map(
        [...originals, ...members].map((member) => [member.id, member]),
      ).values(),
    ];
    const group = buildGroup("copy_suffix", key, combined);
    if (!group) continue;

    const isDuplicate = groups.some(
      (existing) =>
        existing.reason === "normalized_name" &&
        existing.normalizedKey === key,
    );
    if (isDuplicate) continue;

    groups.push(group);
  }

  const duplicateCount = new Set(
    groups.flatMap((group) => group.duplicateIds),
  ).size;

  return {
    scannedAt: new Date().toISOString(),
    totalAssets: assets.length,
    groups,
    duplicateCount,
    uniqueCount: assets.length - duplicateCount,
  };
}

export function mapAssetsToSummaries(
  assets: Array<{
    id: string;
    filename: string;
    fileUrl: string;
    durationMs: number | null;
    originalCreatedAt: Date;
    status: string;
    createdAt: Date;
    transcript: { id: string; rawText?: string } | null;
  }>,
): AudioAssetSummary[] {
  return assets.map((asset) => ({
    id: asset.id,
    filename: asset.filename,
    fileUrl: asset.fileUrl,
    durationMs: asset.durationMs,
    originalCreatedAt: asset.originalCreatedAt.toISOString(),
    status: asset.status,
    createdAt: asset.createdAt.toISOString(),
    transcript: asset.transcript
      ? {
          id: asset.transcript.id,
          preview: asset.transcript.rawText
            ? asset.transcript.rawText.slice(0, 120).trim() +
              (asset.transcript.rawText.length > 120 ? "…" : "")
            : undefined,
        }
      : null,
  }));
}
