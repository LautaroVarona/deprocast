import "server-only";

import { ensurePersonaStub } from "@/lib/kg/personas";
import { DEFAULT_CAMPO_SLUG, isCampoSlug } from "@/lib/projects/campos";
import { createProject } from "@/lib/projects/service";
import {
  incubationExtractionSchema,
  type IncubationExtraction,
} from "@/lib/projects/incubation/schema";
import {
  getIncubationSession,
  markIncubationConsolidated,
} from "@/lib/projects/incubation/session-store";
import { clampScale } from "@/lib/projects/priority";
import type { CreateProjectInput, Project, ProjectTipo } from "@/lib/projects/types";
import { PROJECT_TIPOS } from "@/lib/projects/types";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseFechaInicio(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return todayIsoDate();

  const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return todayIsoDate();
}

function buildDescription(extraction: IncubationExtraction): string {
  const parts: string[] = [];

  if (extraction.ejecucion.estado_actual?.trim()) {
    parts.push(extraction.ejecucion.estado_actual.trim());
  }

  if (extraction.ecosistema.recursos.length > 0) {
    parts.push(
      `Recursos: ${extraction.ecosistema.recursos.join(", ")}`,
    );
  }

  if (extraction.identidad.proyeccion?.trim()) {
    parts.push(`Visión: ${extraction.identidad.proyeccion.trim()}`);
  }

  return parts.join("\n\n").slice(0, 2000);
}

function buildNotasIniciales(extraction: IncubationExtraction): string {
  const lines = ["Incubación conversacional."];

  if (extraction.ejecucion.siguientes_pasos.length > 0) {
    lines.push(
      `Siguientes pasos: ${extraction.ejecucion.siguientes_pasos.join("; ")}`,
    );
  }

  if (extraction.identidad.origen_tiempo?.trim()) {
    lines.push(`Origen: ${extraction.identidad.origen_tiempo.trim()}`);
  }

  return lines.join(" ");
}

function parseTipo(value: string | undefined): ProjectTipo {
  if (value && PROJECT_TIPOS.includes(value as ProjectTipo)) {
    return value as ProjectTipo;
  }
  return "proyecto";
}

export function mapExtractionToCreateInput(
  extraction: IncubationExtraction,
): CreateProjectInput {
  const campoSlug =
    extraction.campoSlug && isCampoSlug(extraction.campoSlug)
      ? extraction.campoSlug
      : DEFAULT_CAMPO_SLUG;

  const resourceTags = extraction.ecosistema.recursos
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => `recurso:${r.slice(0, 80)}`);

  const firstStep = extraction.ejecucion.siguientes_pasos[0]?.trim();
  const notasBase = buildNotasIniciales(extraction);
  const notasIniciales = firstStep
    ? `${notasBase} Primer paso: ${firstStep}`
    : notasBase;

  return {
    title: extraction.identidad.nombre!.trim(),
    tipo: parseTipo(extraction.tipo),
    campoSlug,
    metaTagsSecundarios: resourceTags,
    description: buildDescription(extraction),
    responsable: "",
    subpersonasCargo: [],
    fechaInicio: parseFechaInicio(extraction.identidad.origen_tiempo),
    fechaObjetivo: "",
    prioridad: clampScale(6),
    impacto: clampScale(6),
    dificultad: clampScale(6),
    horasEstimadas: 0,
    horasRealizadas: 0,
    avancePorcentaje: 0,
    estado: "Idea",
    resultadoFinal: extraction.identidad.proyeccion?.trim() ?? "",
    notasIniciales,
  };
}

async function resolvePersonas(names: string[]): Promise<string[]> {
  const resolved: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const stub = await ensurePersonaStub(trimmed);
    resolved.push(stub.primaryName);
  }
  return resolved;
}

export async function consolidateIncubation(
  sessionId: string,
  overrides?: Partial<IncubationExtraction>,
): Promise<Project> {
  const session = await getIncubationSession(sessionId);
  if (!session) {
    throw new Error("Sesión de incubación no encontrada.");
  }
  if (session.status !== "active") {
    throw new Error("La sesión ya fue consolidada o abandonada.");
  }

  const merged = incubationExtractionSchema.parse({
    ...session.extractionState,
    ...overrides,
    identidad: { ...session.extractionState.identidad, ...overrides?.identidad },
    ecosistema: { ...session.extractionState.ecosistema, ...overrides?.ecosistema },
    ejecucion: { ...session.extractionState.ejecucion, ...overrides?.ejecucion },
    completitud: {
      ...session.extractionState.completitud,
      ...overrides?.completitud,
    },
  });

  if (!merged.identidad.nombre?.trim()) {
    throw new Error("Falta el nombre del proyecto.");
  }
  if (!merged.campoSlug || !isCampoSlug(merged.campoSlug)) {
    throw new Error("Seleccioná un Campo válido.");
  }
  if (!merged.ejecucion.estado_actual?.trim()) {
    throw new Error("Falta el estado actual del proyecto.");
  }

  const input = mapExtractionToCreateInput(merged);
  const subpersonasCargo = await resolvePersonas(merged.ecosistema.personas);
  input.subpersonasCargo = subpersonasCargo;

  const project = await createProject(input);
  await markIncubationConsolidated(sessionId, project.id);

  void (async () => {
    try {
      const { ingestSingleProject } = await import("@/lib/kg/sources/projects");
      await ingestSingleProject(project);
    } catch (error) {
      console.error("KG project hook error (incubation):", error);
    }
  })();

  return project;
}
