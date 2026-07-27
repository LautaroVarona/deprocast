import type { MatrixSeed, MoscowTask } from "@/lib/projects/ideate/schema";
import { DEFAULT_CAMPO_SLUG } from "@/lib/projects/campos";
import type { ProjectTipo } from "@/lib/projects/types";

const MOSCOW_LABELS: Record<MoscowTask["priority"], string> = {
  must: "Must",
  should: "Should",
  could: "Could",
  wont: "Won't",
};

export function buildMoscowMarkdown(tasks: MoscowTask[]): string {
  if (tasks.length === 0) return "";

  const groups: Record<MoscowTask["priority"], MoscowTask[]> = {
    must: [],
    should: [],
    could: [],
    wont: [],
  };
  for (const task of tasks) {
    groups[task.priority].push(task);
  }

  const lines: string[] = ["## MoSCoW", ""];
  for (const priority of ["must", "should", "could", "wont"] as const) {
    const items = groups[priority];
    if (items.length === 0) continue;
    lines.push(`### ${MOSCOW_LABELS[priority]}`);
    for (const item of items) {
      const note = item.notes?.trim() ? ` — ${item.notes.trim()}` : "";
      lines.push(`- [ ] ${item.title.trim()}${note}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

export function buildIdeateNotasIniciales(seed: MatrixSeed): string {
  const parts: string[] = [];

  parts.push("## Destilación Ideate");
  parts.push("");
  parts.push(`Dominio: ${seed.identidad.domain}`);
  parts.push(
    `Mago 3: ${seed.motor_temporal.mago3}` +
      (seed.motor_temporal.mago12 != null
        ? ` · Mago 12: ${seed.motor_temporal.mago12}`
        : ""),
  );
  parts.push(`Energía (AP): ${seed.telemetria.energyCost}`);
  parts.push(`Origen: ${seed.telemetria.origin}`);

  if (seed.arsenal.resourceIds.length > 0) {
    parts.push("");
    parts.push("## Arsenal AmazonA");
    parts.push(`Resources: ${seed.arsenal.resourceIds.join(", ")}`);
    if (seed.arsenal.powerIds.length > 0) {
      parts.push(`Powers: ${seed.arsenal.powerIds.join(", ")}`);
    }
  }

  const moscow = buildMoscowMarkdown(seed.operativa.moscow_tasks);
  if (moscow) {
    parts.push("");
    parts.push(moscow);
  }

  return parts.join("\n").trim();
}

export type CoagulatePayload = {
  title: string;
  tipo: ProjectTipo | null;
  campoSlug: string;
  metaTagsSecundarios: string[];
  description: string;
  personIds: string[];
  prioridad: number;
  impacto: number;
  dificultad: number;
  estado: "Idea";
  responsable: string;
  subpersonasCargo: string[];
  fechaInicio: string;
  fechaObjetivo: string;
  horasEstimadas: number;
  horasRealizadas: number;
  avancePorcentaje: number;
  resultadoFinal: string;
  notasIniciales: string;
  amazonAResourceIds: string[];
};

export function matrixSeedToCoagulatePayload(
  seed: MatrixSeed,
  options?: { responsable?: string },
): CoagulatePayload {
  const energy = seed.telemetria.energyCost;
  return {
    title: seed.identidad.title.trim(),
    tipo: seed.identidad.tipo,
    campoSlug: seed.identidad.campoSlug || DEFAULT_CAMPO_SLUG,
    metaTagsSecundarios: seed.arquitectura.tagLabels,
    description: seed.identidad.short_pitch,
    personIds: seed.arquitectura.personNodeIds,
    prioridad: energy,
    impacto: energy,
    dificultad: energy,
    estado: "Idea",
    responsable: options?.responsable ?? "",
    subpersonasCargo: [],
    fechaInicio: "",
    fechaObjetivo: "",
    horasEstimadas: 0,
    horasRealizadas: 0,
    avancePorcentaje: 0,
    resultadoFinal: "",
    notasIniciales: buildIdeateNotasIniciales(seed),
    amazonAResourceIds: seed.arsenal.resourceIds,
  };
}
