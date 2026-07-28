import "server-only";

import { parseMetadataJson } from "@/lib/kg/normalize";
import { ingestSingleProject } from "@/lib/kg/sources/projects";
import { DEFAULT_CAMPO_SLUG } from "@/lib/projects/campos";
import { createProject } from "@/lib/projects/service";
import type { Project } from "@/lib/projects/types";
import { prisma } from "@/lib/prisma";
import { ensureOperatorPersonaNode } from "@/lib/yo/operator-node";
import type { Prisma } from "@prisma/client";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function findProjectKgNode(project: Project): Promise<string | null> {
  const byName = await prisma.kgNode.findUnique({
    where: {
      primaryName_type: {
        primaryName: project.title,
        type: "proyecto",
      },
    },
    select: { id: true, metadata: true },
  });

  if (byName) {
    const meta = parseMetadataJson(byName.metadata);
    if (!meta.projectId || meta.projectId === project.id) {
      return byName.id;
    }
  }

  const candidates = await prisma.kgNode.findMany({
    where: { type: "proyecto" },
    select: { id: true, metadata: true },
  });

  for (const node of candidates) {
    const meta = parseMetadataJson(node.metadata);
    if (meta.projectId === project.id) return node.id;
  }

  return null;
}

/** Vincula Operador ↔ proyecto en CRM tipado + KgEdge sellado. */
async function linkOperatorToProject(
  operatorId: string,
  projectNodeId: string,
  projectTitle: string,
): Promise<void> {
  const relationContext = `Responsable del primer fuego · ${projectTitle}`;

  await prisma.personToProject.upsert({
    where: {
      personId_projectId: {
        personId: operatorId,
        projectId: projectNodeId,
      },
    },
    create: {
      personId: operatorId,
      projectId: projectNodeId,
      relationContext,
      relationType: "responsable_de",
      strength: 10,
    },
    update: {
      relationContext,
      relationType: "responsable_de",
      strength: 10,
    },
  });

  await prisma.kgEdge.upsert({
    where: {
      sourceNodeId_targetNodeId_relationType: {
        sourceNodeId: operatorId,
        targetNodeId: projectNodeId,
        relationType: "responsable_de",
      },
    },
    create: {
      sourceNodeId: operatorId,
      targetNodeId: projectNodeId,
      relationType: "responsable_de",
      context: relationContext,
      weight: 10,
      confidence: 1,
      reconocido: true,
      metadata: { rolPrincipal: "responsable", origin: "genesis-prima" } as Prisma.InputJsonValue,
    },
    update: {
      context: relationContext,
      weight: 10,
      confidence: 1,
      reconocido: true,
      metadata: { rolPrincipal: "responsable", origin: "genesis-prima" } as Prisma.InputJsonValue,
    },
  });
}

export type GenesisProjectBootstrapResult = {
  project: Project;
  projectNodeId: string | null;
};

/**
 * Prima Materia: crea el proyecto real en Atanor, lo coagula en el KG
 * (`reconocido: true`) y lo ancla al hub del Operador.
 */
export async function bootstrapGenesisProject(input: {
  title: string;
  why?: string;
  operatorName: string;
}): Promise<GenesisProjectBootstrapResult> {
  const title = input.title.trim();
  if (!title) {
    throw new Error("El objetivo a 90 días es obligatorio.");
  }

  const operatorName = input.operatorName.trim();
  const description = input.why?.trim()
    ? `Horizonte 90 días: ${input.why.trim()}`
    : "Primer fuego · Consagración Prima Materia.";

  const project = await createProject({
    title,
    tipo: "proyecto",
    campoSlug: DEFAULT_CAMPO_SLUG,
    metaTagsSecundarios: ["origen:consagracion", "origen:prima-materia"],
    description,
    responsable: operatorName,
    subpersonasCargo: [],
    fechaInicio: todayIsoDate(),
    fechaObjetivo: "",
    prioridad: 8,
    impacto: 8,
    dificultad: 6,
    horasEstimadas: 0,
    horasRealizadas: 0,
    avancePorcentaje: 0,
    estado: "Idea",
    resultadoFinal: "",
    notasIniciales:
      "Nacido en Consagración · Prima Materia. Coagulado automáticamente.",
  });

  await ingestSingleProject(project, {
    reconocido: true,
    force: true,
    structuredOnly: true,
  });

  const operator = await ensureOperatorPersonaNode(operatorName);
  const projectNodeId = await findProjectKgNode(project);

  if (!projectNodeId) {
    throw new Error(
      "El proyecto Génesis se creó en Atanor pero no coaguló en el KG. Reintentá Prima Materia.",
    );
  }

  if (!operator) {
    throw new Error(
      "No hay hub Operador en el KG. Completá el bautismo en /yo antes de Prima Materia.",
    );
  }

  await linkOperatorToProject(operator.id, projectNodeId, title);

  return { project, projectNodeId };
}
