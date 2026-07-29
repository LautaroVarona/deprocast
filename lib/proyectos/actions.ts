"use server";

import { registerBabelRecord } from "@/lib/babel/record-store";
import { shouldFilterByUniverse } from "@/lib/babel/context-seal";
import { DEFAULT_CAMPO_SLUG, isCampoSlug } from "@/lib/projects/campos";
import { clampScale } from "@/lib/projects/priority";
import { createProject, listCampos } from "@/lib/projects/service";
import {
  PROJECT_STATUSES,
  PROJECT_TIPOS,
  type CreateProjectInput,
  type Project,
  type ProjectStatus,
  type ProjectTipo,
} from "@/lib/projects/types";
import { importProjectSchema } from "@/lib/proyectos/json-codex";
import { ensureRuntimeReady } from "@/lib/runtime-setup";
import { revalidatePath } from "next/cache";

export type ImportProjectResult =
  | { ok: true; project: Project }
  | { ok: false; error: string };

export type ImportProjectOptions = {
  universeSlug?: string;
};

const STATUS_ALIASES: Record<string, ProjectStatus> = {
  ACTIVE: "Desarrollo",
  PAUSED: "Idea",
  COMPLETED: "Implantado",
  active: "Desarrollo",
  paused: "Idea",
  completed: "Implantado",
  Idea: "Idea",
  Diseño: "Diseño",
  Desarrollo: "Desarrollo",
  Pruebas: "Pruebas",
  Implantado: "Implantado",
  Descartado: "Descartado",
};

function resolveStatus(raw: string | undefined): ProjectStatus {
  if (!raw) return "Idea";
  const mapped = STATUS_ALIASES[raw];
  if (mapped) return mapped;
  if (PROJECT_STATUSES.includes(raw as ProjectStatus)) {
    return raw as ProjectStatus;
  }
  return "Idea";
}

function buildNotasIniciales(
  data: {
    microtareas?: string[];
    hitos?: string[];
  },
): string {
  const items = [...(data.microtareas ?? []), ...(data.hitos ?? [])]
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    return "Materializado vía Códice JSON. Inicialización en el Atanor local.";
  }

  return [
    "Materializado vía Códice JSON.",
    "",
    "Microtareas / hitos sugeridos:",
    ...items.map((item, index) => `${index + 1}. ${item}`),
  ].join("\n");
}

/**
 * Inyecta un proyecto desde JSON (IA externa / plantilla).
 * Persiste en el SSOT markdown (`data/projects/`) y coagula en el KG.
 */
export async function importProjectFromJson(
  jsonString: string,
  options: ImportProjectOptions = {},
): Promise<ImportProjectResult> {
  try {
    await ensureRuntimeReady();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return {
        ok: false,
        error: "JSON inválido: no se pudo parsear el payload.",
      };
    }

    const result = importProjectSchema.safeParse(parsed);
    if (!result.success) {
      const detail = result.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
        .join(" · ");
      return {
        ok: false,
        error: `Esquema inválido — ${detail}`,
      };
    }

    const data = result.data;
    const universeSlug = options.universeSlug?.trim() || undefined;
    const universeCampos = await listCampos(
      universeSlug && shouldFilterByUniverse(universeSlug)
        ? universeSlug
        : undefined,
    );

    let campoSlug = DEFAULT_CAMPO_SLUG;
    if (data.campoSlug && isCampoSlug(data.campoSlug)) {
      const allowed =
        !universeSlug ||
        !shouldFilterByUniverse(universeSlug) ||
        universeCampos.some((campo) => campo.slug === data.campoSlug);
      if (allowed) campoSlug = data.campoSlug;
      else if (universeCampos[0]?.slug) campoSlug = universeCampos[0].slug;
    } else if (universeCampos[0]?.slug) {
      campoSlug = universeCampos[0].slug;
    }

    const g = data.gravityMetrics;
    const prioridad = clampScale(
      data.prioridad ?? g?.prioridad ?? g?.priority ?? 6,
    );
    const impacto = clampScale(data.impacto ?? g?.impacto ?? g?.impact ?? 6);
    const dificultad = clampScale(
      data.dificultad ?? g?.dificultad ?? g?.friction ?? 6,
    );

    const tipo: ProjectTipo | null =
      data.tipo && PROJECT_TIPOS.includes(data.tipo) ? data.tipo : null;

    const input: CreateProjectInput = {
      title: data.title,
      tipo,
      campoSlug,
      metaTagsSecundarios: ["json-codex"],
      description: data.description ?? "",
      responsable: data.responsable?.trim() ?? "",
      subpersonasCargo: [],
      fechaInicio: data.fechaInicio?.trim() ?? "",
      fechaObjetivo: data.fechaObjetivo?.trim() ?? "",
      prioridad,
      impacto,
      dificultad,
      horasEstimadas: Math.max(0, data.horasEstimadas ?? 0),
      horasRealizadas: 0,
      avancePorcentaje: 0,
      estado: resolveStatus(data.status ?? data.estado),
      resultadoFinal: "",
      notasIniciales: buildNotasIniciales(data),
    };

    const project = await createProject(input);

    if (universeSlug && shouldFilterByUniverse(universeSlug)) {
      await registerBabelRecord({
        kind: "capture",
        physicalRef: project.id,
        contextSeal: universeSlug,
        contentPreview: project.title,
        channel: "proyectos",
        campoSlug: project.campoSlug,
        metadata: { sealedVia: "json-codex" },
      });
    }

    try {
      const { ingestSingleProject } = await import("@/lib/kg/sources");
      await ingestSingleProject(project, {
        reconocido: true,
        structuredOnly: true,
        force: true,
      });
    } catch (error) {
      console.error("KG project hook error (JSON import):", error);
    }

    revalidatePath("/proyectos");

    return { ok: true, project };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo materializar el proyecto desde JSON.",
    };
  }
}
