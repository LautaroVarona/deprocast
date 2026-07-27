import { DEFAULT_EXOCORTEX_NAME } from "@/lib/yo/types";

/** Fallback solo si el bautismo aún no fijó nombre. */
export const DEFAULT_OPERATOR_DISPLAY_NAME = "Operador";

export function resolveOperatorDisplayName(
  name: string | null | undefined,
  fallback = DEFAULT_OPERATOR_DISPLAY_NAME,
): string {
  const trimmed = name?.trim();
  return trimmed || fallback;
}

export function resolveExocortexDisplayName(
  name: string | null | undefined,
  fallback = DEFAULT_EXOCORTEX_NAME,
): string {
  const trimmed = name?.trim();
  return trimmed || fallback;
}
