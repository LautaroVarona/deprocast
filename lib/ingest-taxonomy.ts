/**
 * Validación de anclaje del grimorio: Campo (contenedor soberano).
 * Ver docs/deprocast_master_plan.md §4.1.
 */

export {
  DEFAULT_CAMPO_SLUG,
  getCampoLabel,
  getCampoSlugFromLabel,
  isCampoSlug,
  slugifyCampoInput,
  type CampoSlug,
  type CampoInfo,
} from "@/lib/projects/campos";

/** @deprecated Usar CampoSlug */
export type FieldValue = import("@/lib/projects/campos").CampoSlug;

/** @deprecated Usar isCampoSlug */
export { isCampoSlug as isFieldValue } from "@/lib/projects/campos";
