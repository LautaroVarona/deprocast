import { cohereChatWithImages } from "@/lib/cohere/vision";
import { TACHO_DIR } from "@/lib/ingesta/paths";
import { findProjectById } from "@/lib/projects/service";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const VISION_EXTRACTION_PROMPT = `Actúas como un Agente de Extracción y Purificación de Data de alta fidelidad (OCR multimodal). Tu única tarea es transmutar esta imagen en texto limpio en formato Markdown, eliminando el ruido estático pero manteniendo fidelidad absoluta respecto a la materia original.

REGLA CRÍTICA SOBRE TACHONES: No ignores tachones ni correcciones. Si hay palabras, frases o líneas tachadas, transcríbelas reflejando su estado con \`~~texto tachado~~\` o la anotación '[Tachado: texto]'.

REGLA DE FIDELIDAD VISUAL: Si el documento contiene gráficos, diagramas, esquemas, tablas visuales o mapas de relaciones, redacta una descripción analítica implacable de las relaciones visuales: nodos, flechas, jerarquías, flujos, dependencias y etiquetas legibles.

Para texto manuscrito o impreso, prioriza OCR de alta fidelidad línea por línea.

Devuelve ÚNICAMENTE el texto purificado en Markdown, sin saludos, sin preámbulos y sin suposiciones artificiales.`;

const SUPPORTED_MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
};

export type VisionExtractResult = {
  markdown: string;
  tachoPath: string;
  originalFilename: string;
  mimeType: string;
};

export type VisionConfirmResult = {
  contextPath: string;
  filename: string;
};

function resolveMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeType = SUPPORTED_MIME_TYPES[ext];
  if (!mimeType) {
    throw new Error(
      "Formato no soportado. Usá imágenes (.png, .jpg, .webp, .gif, .heic).",
    );
  }
  return mimeType;
}

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename).replace(/[^a-zA-Z0-9._-]+/g, "_");
  return base || "documento";
}

export async function storeInTacho(buffer: Buffer, originalFilename: string): Promise<string> {
  await mkdir(TACHO_DIR, { recursive: true });

  const timestamp = Date.now();
  const safeName = sanitizeFilename(originalFilename);
  const storedName = `${timestamp}_${randomUUID().slice(0, 8)}_${safeName}`;
  const tachoPath = path.join(TACHO_DIR, storedName);

  await writeFile(tachoPath, buffer);
  return tachoPath;
}

async function extractMarkdownFromImages(
  images: Array<{ base64: string; mimeType: string; pageNumber?: number }>,
): Promise<string> {
  if (images.length === 1) {
    return cohereChatWithImages({
      systemPrompt: VISION_EXTRACTION_PROMPT,
      images: [{ base64: images[0].base64, mimeType: images[0].mimeType }],
      userText: "Transcribí este documento a Markdown siguiendo las reglas del sistema.",
    });
  }

  const pageMarkdowns: string[] = [];
  for (const image of images) {
    const pageText = await cohereChatWithImages({
      systemPrompt: VISION_EXTRACTION_PROMPT,
      images: [{ base64: image.base64, mimeType: image.mimeType }],
      userText: `Transcribí la página ${image.pageNumber ?? pageMarkdowns.length + 1} a Markdown.`,
    });
    pageMarkdowns.push(
      `## Página ${image.pageNumber ?? pageMarkdowns.length + 1}\n\n${pageText}`,
    );
  }

  return pageMarkdowns.join("\n\n");
}

export async function extractVisionMarkdown(
  buffer: Buffer,
  originalFilename: string,
): Promise<{ markdown: string; mimeType: string }> {
  const mimeType = resolveMimeType(originalFilename);

  const markdown = await extractMarkdownFromImages([
    {
      base64: buffer.toString("base64"),
      mimeType,
    },
  ]);
  return { markdown, mimeType };
}

export async function processVisionUpload(
  buffer: Buffer,
  originalFilename: string,
): Promise<VisionExtractResult> {
  const tachoPath = await storeInTacho(buffer, originalFilename);
  const { markdown, mimeType } = await extractVisionMarkdown(buffer, originalFilename);

  return {
    markdown,
    tachoPath: path.relative(process.cwd(), tachoPath),
    originalFilename,
    mimeType,
  };
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function buildContextMarkdown(
  purifiedBody: string,
  projectFrontmatter: Record<string, string | number | string[]>,
  source: {
    originalFilename: string;
    tachoPath: string;
    mimeType: string;
  },
): string {
  const timestamp = new Date().toISOString();
  const dateOnly = timestamp.slice(0, 10);

  const inheritedKeys = [
    "id",
    "title",
    "campo",
    "onda",
    "field",
    "prioridad",
    "impacto",
    "estado",
  ] as const;

  const inheritedLines = inheritedKeys
    .filter((key) => projectFrontmatter[key] !== undefined)
    .map((key) => {
      const value = projectFrontmatter[key];
      if (Array.isArray(value)) {
        return `${key}: ${JSON.stringify(value)}`;
      }
      if (typeof value === "number") {
        return `${key}: ${value}`;
      }
      return `${key}: ${yamlString(String(value))}`;
    });

  return [
    "---",
    `source_type: "vision_context"`,
    `context_kind: "document_extraction"`,
    `extracted_at: ${yamlString(timestamp)}`,
    `source_filename: ${yamlString(source.originalFilename)}`,
    `source_mime: ${yamlString(source.mimeType)}`,
    `tacho_path: ${yamlString(source.tachoPath)}`,
    ...inheritedLines,
    "---",
    `### Contexto visual purificado (${dateOnly})`,
    "",
    purifiedBody,
    "",
  ].join("\n");
}

function parseProjectFrontmatter(content: string): Record<string, string | number | string[]> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const result: Record<string, string | number | string[]> = {};

  for (const line of match[1].split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1).trim();
    if (!key) continue;

    if (/^\d+$/.test(rawValue)) {
      result[key] = Number(rawValue);
      continue;
    }

    if (rawValue.startsWith("[")) {
      try {
        const parsed = JSON.parse(rawValue) as unknown;
        if (Array.isArray(parsed)) {
          result[key] = parsed.map(String);
        }
      } catch {
        result[key] = [];
      }
      continue;
    }

    try {
      result[key] = JSON.parse(rawValue) as string;
    } catch {
      result[key] = rawValue.replace(/^"|"$/g, "");
    }
  }

  return result;
}

export async function confirmVisionContext(input: {
  projectId: string;
  markdown: string;
  originalFilename: string;
  tachoPath: string;
  mimeType: string;
}): Promise<VisionConfirmResult> {
  const project = await findProjectById(input.projectId);
  if (!project) {
    throw new Error("Proyecto de destino no encontrado en el Atanor local.");
  }

  const projectContent = await readFile(project.filePath, "utf-8");
  const projectFrontmatter = parseProjectFrontmatter(projectContent);

  const contextMarkdown = buildContextMarkdown(input.markdown, projectFrontmatter, {
    originalFilename: input.originalFilename,
    tachoPath: input.tachoPath,
    mimeType: input.mimeType,
  });

  const filename = `context_${Date.now()}.md`;
  const contextPath = path.join(path.dirname(project.filePath), filename);

  await writeFile(contextPath, contextMarkdown, "utf-8");

  return {
    contextPath: path.relative(process.cwd(), contextPath),
    filename,
  };
}
