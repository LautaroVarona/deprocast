import "server-only";

import { getBabelRecordByPhysicalRef } from "@/lib/babel/record-store";
import { isSourceType, type SourceType } from "@/lib/document-constants";
import { DEFAULT_CAMPO_SLUG, type CampoSlug } from "@/lib/projects/campos";
import type { CaptureGravity } from "@/lib/purifier/capture";

function readString(
  metadata: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function resolveAudioAssetGravity(
  assetId: string,
  filename: string,
): Promise<CaptureGravity> {
  const record = await getBabelRecordByPhysicalRef("audio", assetId);
  const metadata = record?.metadata ?? {};
  const title = readString(metadata, "title") ?? filename.replace(/\.[^.]+$/, "");

  const campoSlug =
    (record?.campoSlug as CampoSlug | null) ??
    readString(metadata, "campoSlug") ??
    readString(metadata, "field") ??
    DEFAULT_CAMPO_SLUG;

  const onda = readString(metadata, "onda") ?? "sin-clasificar";

  const rawSourceType =
    readString(metadata, "sourceType") ?? readString(metadata, "source_type");
  const sourceType: SourceType = isSourceType(rawSourceType)
    ? rawSourceType
    : "personal_writing";

  return {
    title,
    campoSlug,
    onda,
    sourceType,
    universeSlug: readString(metadata, "universeSlug"),
  };
}
