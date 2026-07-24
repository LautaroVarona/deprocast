import "server-only";

import { DEFAULT_EXOCORTEX_NAME } from "@/lib/yo/types";

/**
 * Auto-asignación del nombre del Exocórtex.
 * Canónico y estricto: siempre Mastropiero (sin LLM).
 */
export async function resolveAutonomousExocortexName(
  _operatorName: string,
): Promise<{ name: string; source: "default" }> {
  return { name: DEFAULT_EXOCORTEX_NAME, source: "default" };
}
