import "server-only";

import { extractFinancialDraftFromText } from "@/lib/finanzas/broker";
import type { BrokerDraft } from "@/lib/finanzas/types";
import { transcribeSaludAudioBuffer } from "@/lib/health/transcribe-note";
import { cohereChatWithImages } from "@/lib/cohere/vision";

export type IngestModality = "text" | "audio" | "image";

export type IngestFinancialInput = {
  modality: IngestModality;
  text?: string;
  file?: { buffer: Buffer; filename: string; mimeType: string };
};

const RECEIPT_VISION_PROMPT = `Extraé el texto legible de este ticket, factura o captura financiera.
Incluí: comercio, monto, moneda, fecha, concepto y cualquier detalle de pago.
Devolvé texto plano conciso, sin markdown ni saludos.`;

async function extractTextFromImage(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const ext = filename.toLowerCase();
  const mimeType = ext.endsWith(".png")
    ? "image/png"
    : ext.endsWith(".webp")
      ? "image/webp"
      : ext.endsWith(".gif")
        ? "image/gif"
        : "image/jpeg";

  return cohereChatWithImages({
    systemPrompt: RECEIPT_VISION_PROMPT,
    images: [{ base64: buffer.toString("base64"), mimeType }],
    userText: "Transcribí los datos financieros de esta imagen.",
  });
}

export async function ingestFinancialDraft(
  input: IngestFinancialInput,
): Promise<{ draft: BrokerDraft; sourceRaw: string; sourceChannel: IngestModality }> {
  const userText = input.text?.trim() ?? "";
  let sourceRaw = userText;
  let context: string | undefined;

  if (input.modality === "image" && input.file) {
    const ocrText = await extractTextFromImage(
      input.file.buffer,
      input.file.filename,
    );
    sourceRaw = userText ? `${ocrText}\n\nNota: ${userText}` : ocrText;
    context = "OCR de ticket/factura financiera.";
  } else if (input.modality === "audio" && input.file) {
    const transcript = await transcribeSaludAudioBuffer(
      input.file.buffer,
      input.file.filename,
    );
    sourceRaw = userText
      ? `${transcript.rawText}\n\nNota adicional: ${userText}`
      : transcript.rawText;
    context = "Transcripción de nota de voz financiera.";
  } else {
    if (!userText) {
      throw new Error("Describí el movimiento o adjuntá imagen/audio.");
    }
  }

  const draft = await extractFinancialDraftFromText(sourceRaw, context);

  return {
    draft,
    sourceRaw,
    sourceChannel: input.modality,
  };
}
