import "server-only";

import { cohereGenerateJson } from "@/lib/cohere/chat";
import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";
import { syncAsaltoMirrorFromTask } from "@/lib/pendientes/asalto-mirror";
import {
  createPendingTask,
  findDuplicateTask,
} from "@/lib/pendientes/store";
import type { PendingTaskDto } from "@/lib/pendientes/types";
import { findProjectById } from "@/lib/projects/service";
import { prisma } from "@/lib/prisma";
import type {
  TaskBreakerEntity,
  TaskBreakerMicrotask,
  TaskBreakerResult,
} from "@/lib/ludus/types";
import { z } from "zod";

export const TASK_BREAKER_MIN_MINUTES = 15;
export const TASK_BREAKER_MAX_MINUTES = 40;
export const TASK_BREAKER_OPTIMAL_MIN = 15;
export const TASK_BREAKER_OPTIMAL_MAX = 25;

export type { TaskBreakerEntity, TaskBreakerMicrotask, TaskBreakerResult };

export type TaskBreakerInput = {
  projectId?: string;
  entities?: TaskBreakerEntity[];
  contextString: string;
  universeSlug?: string;
};

export type CoagulateTaskBreakerInput = {
  microtasks: Array<{
    title: string;
    description?: string;
    estimatedMinutes: number;
    gravityWeight: number;
    projectId?: string | null;
  }>;
  universeSlug?: string;
};

const SYSTEM_PROMPT = `Sos el Task-Breaker de Deprocast OS — la Trituradora de Fricción.
Tu trabajo NO es dar consejos, motivación ni estrategia. Tu ÚNICA misión es DESGLOSAR trabajo.

Recibís un Boss (proyecto pesado), entidades (personas/contextos) y un objetivo narrativo.
Devolvé SOLO JSON válido (sin markdown) con esta forma exacta:
{
  "microtasks": [
    {
      "title": "verbo imperativo + objeto concreto",
      "description": "qué hacer exactamente, sin ambigüedad",
      "estimatedMinutes": 15-40,
      "gravityWeight": 1-12
    }
  ]
}

REGLA DE ORO — no negociable:
- Ninguna tarea puede superar 40 minutos de ejecución estimada.
- Tiempo óptimo: 15–25 minutos. Preferí ese rango.
- Mínimo absoluto: 15 minutos.

Reglas de fragmentación:
- Cada microtarea debe ser estrictamente accionable (empezar YA, sin preparación vaga).
- Secuencia lógica: el orden del array es el orden de ejecución.
- Títulos en imperativo español, ≤ 80 caracteres.
- description: 1–2 oraciones concretas (herramientas, archivos, entregable).
- gravityWeight: urgencia×impacto en escala 1–12 (12 = crítico hoy).
- Máximo 12 microtareas. Preferí 4–8 si alcanza.
- No inventes dependencias externas ni "investigar más" como tarea final infinita.
- Si el input es vago, igual fragmentalo en primeros pasos físicos observables.`;

const llmMicrotaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().default(""),
  estimatedMinutes: z.number().finite(),
  gravityWeight: z.number().finite(),
});

const llmResponseSchema = z.object({
  microtasks: z.array(llmMicrotaskSchema).max(16),
});

function clampMinutes(value: number): number {
  const rounded = Math.round(value);
  return Math.min(
    TASK_BREAKER_MAX_MINUTES,
    Math.max(TASK_BREAKER_MIN_MINUTES, rounded),
  );
}

function clampWeight(value: number): number {
  return Math.min(
    MAX_BASE_WEIGHT,
    Math.max(MIN_BASE_WEIGHT, Math.round(value)),
  );
}

function makeLocalId(index: number): string {
  return `tb-${Date.now().toString(36)}-${index}`;
}

function normalizeMicrotasks(
  raw: z.infer<typeof llmMicrotaskSchema>[],
  projectId: string | null,
): TaskBreakerMicrotask[] {
  return raw
    .map((item, index) => ({
      localId: makeLocalId(index),
      title: item.title.trim(),
      description: (item.description ?? "").trim(),
      estimatedMinutes: clampMinutes(item.estimatedMinutes),
      gravityWeight: clampWeight(item.gravityWeight),
      projectId,
      sequence: index + 1,
    }))
    .filter((item) => item.title.length > 0)
    .slice(0, 12);
}

function fallbackMicrotasks(
  contextString: string,
  projectId: string | null,
): TaskBreakerMicrotask[] {
  const seed = contextString.trim().slice(0, 120) || "el Boss";
  const drafts = [
    {
      title: `Definir el próximo entregable concreto de: ${seed}`,
      description:
        "Escribí en una frase qué queda listo al terminar este bloque. Sin alcance infinito.",
      estimatedMinutes: 15,
      gravityWeight: 8,
    },
    {
      title: "Abrir el material del Boss y marcar el primer obstáculo",
      description:
        "Abrí el archivo/carpeta/herramienta principal. Anotá el primer bloqueo en una línea.",
      estimatedMinutes: 20,
      gravityWeight: 7,
    },
    {
      title: "Ejecutar el primer paso físico observable",
      description:
        "Hacé una acción verificable (escribir, enviar, editar, mover) que reduzca fricción.",
      estimatedMinutes: 25,
      gravityWeight: 9,
    },
    {
      title: "Cerrar el bloque con evidencia y siguiente micro-paso",
      description:
        "Guardá evidencia del avance y dejá escrito el siguiente paso de ≤25 min.",
      estimatedMinutes: 15,
      gravityWeight: 6,
    },
  ];

  return normalizeMicrotasks(drafts, projectId);
}

async function resolveProjectContext(projectId?: string): Promise<{
  projectId: string | null;
  projectTitle: string | null;
  projectSummary: string | null;
}> {
  if (!projectId?.trim()) {
    return { projectId: null, projectTitle: null, projectSummary: null };
  }

  const match = await findProjectById(projectId.trim());
  if (!match) {
    return { projectId: null, projectTitle: null, projectSummary: null };
  }

  return {
    projectId: match.id,
    projectTitle: match.title,
    projectSummary: [
      `Título: ${match.title}`,
      `Campo: ${match.campo}`,
      `Estado: ${match.estado}`,
      match.description
        ? `Descripción: ${match.description.slice(0, 800)}`
        : null,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function resolveEntityLabels(
  entities: TaskBreakerEntity[] | undefined,
): Promise<string[]> {
  if (!entities?.length) return [];

  const labels: string[] = [];
  for (const entity of entities) {
    if (entity.label.trim()) {
      labels.push(`${entity.kind}: ${entity.label.trim()}`);
      continue;
    }
    if (entity.id) {
      const node = await prisma.kgNode.findUnique({
        where: { id: entity.id },
        select: { primaryName: true, type: true },
      });
      if (node) {
        labels.push(`${node.type}: ${node.primaryName}`);
      }
    }
  }
  return labels;
}

export async function breakBossIntoMicrotasks(
  input: TaskBreakerInput,
): Promise<TaskBreakerResult> {
  const contextString = input.contextString.trim();
  if (!contextString && !input.projectId && !(input.entities?.length)) {
    throw new Error(
      "Necesitás un objetivo narrativo, un proyecto o al menos una entidad para triturar.",
    );
  }

  const project = await resolveProjectContext(input.projectId);
  const entityLabels = await resolveEntityLabels(input.entities);

  const userPayload = {
    objetivoNarrativo: contextString || "Fragmentar este Boss en microtareas accionables.",
    proyecto: project.projectSummary,
    entidades: entityLabels,
    reglasTiempo: {
      minMinutes: TASK_BREAKER_MIN_MINUTES,
      maxMinutes: TASK_BREAKER_MAX_MINUTES,
      optimalRange: [TASK_BREAKER_OPTIMAL_MIN, TASK_BREAKER_OPTIMAL_MAX],
    },
  };

  try {
    const raw = await cohereGenerateJson<unknown>({
      systemPrompt: SYSTEM_PROMPT,
      userContent: JSON.stringify(userPayload),
      temperature: 0.2,
      maxTokens: 2500,
      throttle: true,
    });

    const parsed = llmResponseSchema.safeParse(raw);
    if (parsed.success && parsed.data.microtasks.length > 0) {
      return {
        microtasks: normalizeMicrotasks(
          parsed.data.microtasks,
          project.projectId,
        ),
        projectId: project.projectId,
        projectTitle: project.projectTitle,
        source: "llm",
      };
    }
  } catch (error) {
    console.warn("Task-Breaker Cohere fallback:", error);
  }

  return {
    microtasks: fallbackMicrotasks(
      contextString || project.projectTitle || "Boss",
      project.projectId,
    ),
    projectId: project.projectId,
    projectTitle: project.projectTitle,
    source: "fallback",
  };
}

function buildDescription(
  description: string | undefined,
  estimatedMinutes: number,
): string {
  const base = (description ?? "").trim();
  const stamp = `Estimado: ${estimatedMinutes} min (Task-Breaker)`;
  if (!base) return stamp;
  if (base.includes("Estimado:")) return base;
  return `${base}\n\n${stamp}`;
}

export async function coagulateMicrotasks(
  input: CoagulateTaskBreakerInput,
): Promise<{ tasks: PendingTaskDto[]; created: number; skipped: number }> {
  if (!input.microtasks.length) {
    throw new Error("No hay microtareas para coagular.");
  }

  const tasks: PendingTaskDto[] = [];
  let skipped = 0;

  for (const draft of input.microtasks) {
    const title = draft.title.trim();
    if (!title) {
      skipped += 1;
      continue;
    }

    const duplicate = await findDuplicateTask({
      title,
      sourceRef: draft.projectId ?? undefined,
    });
    if (duplicate) {
      skipped += 1;
      continue;
    }

    const minutes = clampMinutes(draft.estimatedMinutes);
    const weight = clampWeight(draft.gravityWeight);
    const status = weight >= 4 ? "calibrated" : "recognized";

    const task = await createPendingTask({
      title,
      description: buildDescription(draft.description, minutes),
      source: "task-breaker",
      sourceRef: draft.projectId ?? undefined,
      projectId: draft.projectId ?? undefined,
      universeSlug: input.universeSlug ?? "babel",
      status,
      weight,
      recognizedAt: new Date(),
      calibratedAt: status === "calibrated" ? new Date() : undefined,
    });

    await syncAsaltoMirrorFromTask(task, {
      action: status === "calibrated" ? "calibrate" : "recognize",
      weight,
    });

    // Si hay proyecto, forjar también LudusMicrotask para Campamento/Forja.
    if (draft.projectId) {
      await prisma.ludusMicrotask.create({
        data: {
          projectId: draft.projectId,
          title,
          estimatedMin: minutes,
          baseWeight: weight,
        },
      });
    }

    tasks.push(task);
  }

  return { tasks, created: tasks.length, skipped };
}
