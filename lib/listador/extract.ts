import "server-only";

import { cohereGenerateText } from "@/lib/cohere/chat";
import { stripMarkdownFences } from "@/lib/cohere/extract";
import {
  listadorExtractionSchema,
  type ListadorExtraction,
} from "@/lib/listador/types";

const LISTADOR_PROMPT = `Sos El Listador de Deprocast. Analizá el texto en lenguaje natural y extraé acciones, compromisos, recordatorios y eventos accionables.

Devolvé ÚNICAMENTE JSON válido (sin markdown) con esta forma:
{
  "tasks": [
    {
      "title": "acción breve en imperativo",
      "description": "contexto opcional",
      "bloque": "Meta|Salud|Educación|Finanzas|Leyes|Tech",
      "confidence": 0.0-1.0,
      "targetDayOffset": "yesterday|today|tomorrow"
    }
  ]
}

Reglas:
- Detectá verbos de acción, compromisos ("tengo que", "debo", "mañana haré"), recordatorios y citas con acción.
- targetDayOffset: "tomorrow" si menciona mañana; "yesterday" si es algo pendiente de ayer; default "today".
- bloque: inferí el eje de vida más probable; omití si no es claro.
- confidence: qué tan seguro estás de que es una tarea real (0-1).
- No dupliques la misma acción con distintas palabras.
- Si no hay tareas detectables, devolvé { "tasks": [] }
- No inventes tareas que no estén implícitas o explícitas en el texto.`;

export async function extractTasksFromText(
  text: string,
): Promise<ListadorExtraction> {
  const trimmed = text.trim();
  if (!trimmed) return { tasks: [] };

  const raw = stripMarkdownFences(
    await cohereGenerateText({
      systemPrompt: LISTADOR_PROMPT,
      userContent: trimmed,
      modelKind: "fast",
      jsonMode: true,
      throttle: true,
    }),
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { tasks: [] };
  }

  const validated = listadorExtractionSchema.safeParse(parsed);
  if (!validated.success) {
    return { tasks: [] };
  }

  return validated.data;
}
