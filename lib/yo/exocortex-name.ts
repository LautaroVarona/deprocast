import "server-only";

import { cohereGenerateText } from "@/lib/cohere/chat";
import {
  EXOCORTEX_SELF_NAME_SYSTEM_PROMPT,
  EXOCORTEX_SELF_NAME_USER_PROMPT,
} from "@/lib/yo/prompts";
import { DEFAULT_EXOCORTEX_NAME } from "@/lib/yo/types";

function sanitizeExocortexName(raw: string): string | null {
  const cleaned = raw
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^nombre\s*[:=]\s*/i, "")
    .split(/\r?\n/)[0]
    ?.trim()
    .replace(/[^\p{L}\p{N}\s\-_.]/gu, "")
    .trim();

  if (!cleaned) return null;
  if (cleaned.length < 2 || cleaned.length > 24) return null;
  if (/\s{2,}/.test(cleaned)) return null;
  return cleaned;
}

/**
 * Auto-asignación del nombre del Exocórtex.
 * Preferencia canónica: Mastropiero. Cohere puede confirmarlo o proponer variante coherente.
 */
export async function resolveAutonomousExocortexName(
  operatorName: string,
): Promise<{ name: string; source: "llm" | "default" }> {
  try {
    const raw = await cohereGenerateText({
      systemPrompt: EXOCORTEX_SELF_NAME_SYSTEM_PROMPT,
      userContent: EXOCORTEX_SELF_NAME_USER_PROMPT(operatorName),
      temperature: 0.55,
      maxTokens: 24,
      modelKind: "default",
    });

    const name = sanitizeExocortexName(raw);
    if (name) {
      return { name, source: "llm" };
    }
  } catch (error) {
    console.warn("Exocórtex auto-nombre falló; usando default.", error);
  }

  return { name: DEFAULT_EXOCORTEX_NAME, source: "default" };
}
