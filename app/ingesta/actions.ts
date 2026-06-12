"use server";

import { confirmVisionContext, processVisionUpload } from "@/lib/ingesta/vision/extract";
import { importStructuredTable } from "@/lib/ingesta/tablas/import";
import { isCampoSlug, type CampoSlug } from "@/lib/projects/campos";

export async function importTableFileAction(formData: FormData) {
  const file = formData.get("file");
  const rawCampo = formData.get("campoSlug");

  if (!(file instanceof File)) {
    return { error: "Se requiere un archivo." };
  }

  let campoSlug: CampoSlug | null = null;
  if (typeof rawCampo === "string" && rawCampo.trim()) {
    const trimmed = rawCampo.trim();
    if (!isCampoSlug(trimmed)) {
      return { error: "El Campo seleccionado no es válido." };
    }
    campoSlug = trimmed;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return { error: "El archivo está vacío." };
  }

  try {
    const result = await importStructuredTable({
      buffer,
      filename: file.name,
      campoSlug,
    });

    if (result.imported === 0 && result.totalRows > 0) {
      return {
        error: "No se pudo estructurar ningún proyecto desde la tabla.",
        ...result,
      };
    }

    return { success: true, ...result };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo procesar la tabla estructurada.";
    return { error: message };
  }
}

export async function extractVisionFileAction(formData: FormData) {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { error: "Se requiere un archivo." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return { error: "El archivo está vacío." };
  }

  try {
    const result = await processVisionUpload(buffer, file.name);
    return { success: true, ...result };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo procesar el documento visual.";
    return { error: message };
  }
}

export async function confirmVisionAction(input: {
  projectId: string;
  markdown: string;
  originalFilename: string;
  tachoPath: string;
  mimeType: string;
}) {
  try {
    const result = await confirmVisionContext(input);
    return { success: true, ...result };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo confirmar el contexto visual.";
    return { error: message };
  }
}
