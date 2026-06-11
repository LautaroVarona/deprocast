import { access, mkdir, writeFile } from "fs/promises";
import path from "path";
import type { SourceType } from "@/lib/document-constants";

const PENDING_DIR = path.join(
  process.cwd(),
  "data",
  "raw_documents",
  "pending",
);

function sanitizeTitle(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");

  return slug || "sin-titulo";
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

type SaveRawDocumentInput = {
  title: string;
  sourceType: SourceType;
  baseWeight: number;
  content: string;
};

export async function saveRawDocument({
  title,
  sourceType,
  baseWeight,
  content,
}: SaveRawDocumentInput): Promise<{ filename: string }> {
  await mkdir(PENDING_DIR, { recursive: true });

  const createdAt = new Date();
  const displayTitle = title.trim() || "Sin título";
  const timestamp = Math.floor(createdAt.getTime() / 1000);
  const baseName = `${timestamp}_${sanitizeTitle(displayTitle)}`;

  let filename = `${baseName}.md`;
  let suffix = 1;
  while (await fileExists(path.join(PENDING_DIR, filename))) {
    filename = `${baseName}-${suffix}.md`;
    suffix += 1;
  }

  const frontmatter = [
    "---",
    `title: ${JSON.stringify(displayTitle)}`,
    `source_type: "${sourceType}"`,
    `base_weight: ${baseWeight}`,
    `created_at: "${createdAt.toISOString()}"`,
    "---",
  ].join("\n");

  await writeFile(
    path.join(PENDING_DIR, filename),
    `${frontmatter}\n${content}\n`,
    "utf-8",
  );

  return { filename };
}
