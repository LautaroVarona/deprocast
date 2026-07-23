/** Constantes y tipos seguros para importar desde componentes cliente. */

export const CAPTURE_SUCCESS_TOAST =
  "Prima materia capturada. Enviada a purificación...";

export const CAPTURE_QUEUED_TOAST =
  "Prima materia en cola. Purificación en segundo plano…";

/** @deprecated Preferí PIPELINE_STATUSES / MATERIA_ESTADO_* canónicos. */
export const MATERIA_ESTADO_PENDING_PURIFICATION = "pendiente_purificacion";

export const MATERIA_ESTADO_PRIMA_MATERIA = "prima_materia";
export const MATERIA_ESTADO_PENDIENTE_PURIFICACION = "pendiente_purificacion";
export const MATERIA_ESTADO_PENDIENTE_VALIDACION = "pendiente_validacion";
export const MATERIA_ESTADO_MOLECULARIZADO = "molecularizado";

export type IngestaChannel = "texto" | "audio" | "tablas" | "vision" | "x-bookmarks";
