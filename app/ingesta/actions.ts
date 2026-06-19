"use server";

import { tableBufferToRawText } from "@/lib/ingesta/tablas/to-raw-text";
import { processVisionUpload } from "@/lib/ingesta/vision/extract";
import { captureAndPurify } from "@/lib/purifier/capture";
import { isSourceType } from "@/lib/document-constants";
import { isCampoSlug, type CampoSlug } from "@/lib/projects/campos";

function parseCampoSlug(raw: FormDataEntryValue | null): CampoSlug | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const trimmed = raw.trim();
  return isCampoSlug(trimmed) ? trimmed : undefined;
}

function parseCaptureGravity(formData: FormData) {
  const title = formData.get("title");
  const onda = formData.get("onda");
  const sourceType = formData.get("sourceType");

  return {
    title: typeof title === "string" ? title : undefined,
    campoSlug: parseCampoSlug(formData.get("campoSlug")),
    onda: typeof onda === "string" ? onda : undefined,
    sourceType:
      typeof sourceType === "string" && isSourceType(sourceType)
        ? sourceType
        : undefined,
  };
}

export async function captureTableFileAction(formData: FormData) {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { error: "Se requiere un archivo." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return { error: "El archivo está vacío." };
  }

  try {
    const rawText = await tableBufferToRawText(buffer, file.name);
    const result = await captureAndPurify({
      channel: "tablas",
      rawText,
      filename: file.name,
      gravity: parseCaptureGravity(formData),
    });

    return { success: true, ...result };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo capturar la tabla.";
    return { error: message };
  }
}

export async function captureVisionFileAction(formData: FormData) {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { error: "Se requiere un archivo." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return { error: "El archivo está vacío." };
  }

  try {
    const extracted = await processVisionUpload(buffer, file.name);
    const result = await captureAndPurify({
      channel: "vision",
      rawText: extracted.markdown,
      filename: file.name,
      metadata: {
        tachoPath: extracted.tachoPath,
        mimeType: extracted.mimeType,
      },
      gravity: parseCaptureGravity(formData),
    });

    return { success: true, ...result };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo capturar el documento visual.";
    return { error: message };
  }
}
