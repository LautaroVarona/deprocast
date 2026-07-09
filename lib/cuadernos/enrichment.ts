import "server-only";

import type { PageEnrichmentAction } from "@/lib/cuadernos/types";
import { cohereGenerateText } from "@/lib/cohere/chat";

const ACTION_PROMPTS: Record<PageEnrichmentAction, string> = {
  diagrama:
    "Interpretá los diagramas y conexiones visuales de esta página. Describí la estructura, nodos, flechas y significado relacional.",
  esquema:
    "Generá un esquema jerárquico o outline en markdown a partir del contenido manuscrito y visual de la página.",
  relacionar:
    "Relacioná el contenido de esta página con conceptos, proyectos y temas mencionados. Sugerí conexiones con otras ideas del corpus.",
  dibujos:
    "Interpretá dibujos, símbolos, runas o marcas no textuales. Explicá qué representan y cómo complementan el texto.",
  custom:
    "Respondé la petición del usuario sobre esta página manuscrita, integrando texto y elementos visuales.",
};

export async function runPageEnrichment(input: {
  action: PageEnrichmentAction;
  customPrompt?: string;
  semanticVector: string;
  structuralNotes: string;
  notebookTitle: string;
  pageNumber: number;
  authorName?: string | null;
}): Promise<string> {
  const baseInstruction = ACTION_PROMPTS[input.action];
  const userPrompt = [
    `Cuaderno/libro: ${input.notebookTitle}`,
    input.authorName ? `Autor: ${input.authorName}` : null,
    `Página: ${input.pageNumber}`,
    "",
    "=== Transcripción (vector semántico) ===",
    input.semanticVector.trim() || "(sin texto detectado)",
    "",
    "=== Notas estructurales / visuales ===",
    input.structuralNotes.trim() || "(sin notas estructurales)",
    "",
    input.action === "custom" && input.customPrompt?.trim()
      ? `=== Petición del usuario ===\n${input.customPrompt.trim()}`
      : null,
    "",
    `=== Tarea ===\n${baseInstruction}`,
    "Respondé en español, con markdown cuando ayude.",
  ]
    .filter(Boolean)
    .join("\n");

  const text = await cohereGenerateText({
    systemPrompt:
      "Sos un asistente cognitivo para cuadernos y libros manuscritos. Enriquecés el contenido más allá del OCR literal.",
    userContent: userPrompt,
    modelKind: "default",
  });

  if (!text.trim()) {
    throw new Error("La IA no devolvió un enriquecimiento.");
  }

  return text.trim();
}
