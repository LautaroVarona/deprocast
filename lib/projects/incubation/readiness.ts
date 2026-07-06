import { isCampoSlug } from "@/lib/projects/campos";
import type { IncubationExtraction } from "@/lib/projects/incubation/schema";

export type IncubationReadiness = {
  isReady: boolean;
  missing: string[];
  recommendations: string[];
  completitud: IncubationExtraction["completitud"];
};

export function evaluateReadiness(extraction: IncubationExtraction): IncubationReadiness {
  const missing: string[] = [];
  const recommendations: string[] = [];

  if (!extraction.identidad.nombre?.trim()) {
    missing.push("Nombre del proyecto");
  }

  if (!extraction.campoSlug || !isCampoSlug(extraction.campoSlug)) {
    missing.push("Campo del proyecto");
  }

  if (!extraction.ejecucion.estado_actual?.trim()) {
    missing.push("Estado actual");
  }

  if (
    extraction.ecosistema.personas.length === 0 &&
    extraction.ecosistema.recursos.length === 0
  ) {
    recommendations.push("Agregar al menos una persona o recurso");
  }

  if (extraction.ejecucion.siguientes_pasos.length === 0) {
    recommendations.push("Definir al menos un siguiente paso");
  }

  if (!extraction.identidad.proyeccion?.trim()) {
    recommendations.push("Visión a largo plazo");
  }

  return {
    isReady: missing.length === 0,
    missing,
    recommendations,
    completitud: extraction.completitud,
  };
}
