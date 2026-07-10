import { getCampoLabel, isCampoSlug, type CampoSlug } from "@/lib/projects/campos";
import { getProjectDir } from "@/lib/projects/paths";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const CAMPO_META_FILENAME = ".campo.json";

export type CampoMeta = {
  slug: CampoSlug;
  label: string;
  description: string;
  createdAt: string;
  universeSlug?: string;
};

function getCampoMetaPath(slug: CampoSlug): string {
  return path.join(getProjectDir(slug), CAMPO_META_FILENAME);
}

export async function readCampoMeta(slug: CampoSlug): Promise<CampoMeta | null> {
  if (!isCampoSlug(slug)) return null;

  try {
    const raw = await readFile(getCampoMetaPath(slug), "utf8");
    const parsed = JSON.parse(raw) as Partial<CampoMeta>;
    if (!parsed.slug || !parsed.label) return null;

    return {
      slug: parsed.slug,
      label: parsed.label,
      description: String(parsed.description ?? ""),
      createdAt: String(parsed.createdAt ?? ""),
      universeSlug: parsed.universeSlug,
    };
  } catch {
    return null;
  }
}

export async function writeCampoMeta(meta: CampoMeta): Promise<void> {
  await writeFile(getCampoMetaPath(meta.slug), JSON.stringify(meta, null, 2), "utf8");
}

export async function resolveCampoLabel(slug: CampoSlug): Promise<string> {
  const meta = await readCampoMeta(slug);
  return meta?.label ?? getCampoLabel(slug);
}
