import {
  normalizeToPersonaList,
  prosopografoImportEnvelopeSchema,
  type ProsopografoPersonaRaw,
} from "@/lib/personas/prosopografo/schema";

/** Quita fences markdown ```json ... ``` si el LLM los incluyó. */
export function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence?.[1]) return fence[1].trim();

  // A veces hay prosa antes/después del fence.
  const inner = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (inner?.[1]) return inner[1].trim();

  return trimmed;
}

export type ParsePersonaImportResult =
  | { ok: true; personas: ProsopografoPersonaRaw[] }
  | { ok: false; error: string };

export function parsePersonaImportPayload(
  input: string | unknown,
): ParsePersonaImportResult {
  let raw: unknown = input;

  if (typeof input === "string") {
    const stripped = stripJsonFences(input);
    if (!stripped) {
      return { ok: false, error: "El JSON está vacío." };
    }
    try {
      raw = JSON.parse(stripped);
    } catch {
      return {
        ok: false,
        error: "JSON inválido. Pegá el objeto completo que devolvió el LLM.",
      };
    }
  }

  const parsed = prosopografoImportEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path?.length ? first.path.join(".") : "root";
    return {
      ok: false,
      error: `Schema inválido (${path}): ${first?.message ?? "error de validación"}. Se requiere nombrePrincipal.`,
    };
  }

  const personas = normalizeToPersonaList(parsed.data).filter((p) =>
    p.nombrePrincipal.trim(),
  );
  if (personas.length === 0) {
    return { ok: false, error: "No hay personas con nombrePrincipal." };
  }

  return { ok: true, personas };
}
