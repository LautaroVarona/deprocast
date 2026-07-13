import "server-only";

import { cohereGenerateText } from "@/lib/cohere/chat";
import { stripMarkdownFences } from "@/lib/cohere/extract";
import {
  trailingCommandsExtractionSchema,
  type TrailingCommandsExtraction,
} from "@/lib/trailing-commands/types";

const TRAILING_COMMANDS_PROMPT = `Sos el extractor de comandos ejecutables de Deprocast. Analizá el texto transcrito de audio y extraé acciones concretas que el usuario deba ejecutar en el mundo real.

Devolvé ÚNICAMENTE JSON válido (sin markdown) con esta forma:
{
  "commands": [
    {
      "title": "acción breve en imperativo",
      "description": "contexto opcional",
      "bloque": "Meta|Salud|Educación|Finanzas|Leyes|Tech",
      "confidence": 0.0-1.0,
      "targetDayOffset": "yesterday|today|tomorrow",
      "weekday": 0-6,
      "timeOfDay": "HH:mm",
      "injectCalendar": true
    }
  ]
}

Reglas:
- Detectá compromisos explícitos: "tengo que", "debo", "me olvidé de", "llamar a", "ir al", citas, trámites.
- weekday: 0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado. Usalo si menciona un día de la semana ("el martes", "el viernes").
- targetDayOffset: "tomorrow" si dice mañana; "yesterday" si es pendiente de ayer; default "today".
- timeOfDay: solo si menciona hora concreta ("a las 15", "14:30").
- injectCalendar: true si la acción tiene fecha/hora específica o día de semana; false para tareas genéricas sin agenda.
- confidence: qué tan seguro estás de que es una acción real (0-1).
- No dupliques la misma acción.
- Si no hay comandos ejecutables, devolvé { "commands": [] }
- No inventes acciones que no estén en el texto.`;

export async function extractTrailingCommandsFromText(
  text: string,
): Promise<TrailingCommandsExtraction> {
  const trimmed = text.trim();
  if (!trimmed) return { commands: [] };

  const raw = stripMarkdownFences(
    await cohereGenerateText({
      systemPrompt: TRAILING_COMMANDS_PROMPT,
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
    return { commands: [] };
  }

  const validated = trailingCommandsExtractionSchema.safeParse(parsed);
  if (!validated.success) {
    return { commands: [] };
  }

  return validated.data;
}
