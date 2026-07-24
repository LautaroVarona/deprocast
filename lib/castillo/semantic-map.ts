import "server-only";

import {
  resolveContextSealFromRequest,
  shouldFilterByUniverse,
} from "@/lib/babel/context-seal";
import { resolveUniverseKgNodeIds } from "@/lib/babel/universe-refs";
import type {
  SemanticMapEdge,
  SemanticMapNode,
  SemanticMapSnapshot,
} from "@/lib/castillo/semantic-map-types";
import { prisma } from "@/lib/prisma";
import { listProjects } from "@/lib/projects/service";
import type { NextRequest } from "next/server";
import { ensureOperatorPersonaNode } from "@/lib/yo/operator-node";

export type {
  SemanticMapEdge,
  SemanticMapNode,
  SemanticMapNodeKind,
  SemanticMapSnapshot,
} from "@/lib/castillo/semantic-map-types";

const YO_ID = "yo";

function projectDeepLink(projectId: string): string {
  return `/proyectos?highlight=${projectId}`;
}

export async function buildCastilloSemanticSnapshot(
  request?: NextRequest,
): Promise<SemanticMapSnapshot> {
  const universeSlug = request
    ? resolveContextSealFromRequest(request)
    : null;
  const nodeIds =
    universeSlug && shouldFilterByUniverse(universeSlug)
      ? await resolveUniverseKgNodeIds(universeSlug)
      : null;

  const [personaNodes, proyectoKgNodes, kgEdges, projects, notebooks, operator] =
    await Promise.all([
      prisma.kgNode.findMany({
        where: {
          type: "persona",
          ...(nodeIds ? { id: { in: [...nodeIds] } } : {}),
        },
        orderBy: { primaryName: "asc" },
        take: 80,
      }),
      prisma.kgNode.findMany({
        where: {
          type: "proyecto",
          ...(nodeIds ? { id: { in: [...nodeIds] } } : {}),
        },
        orderBy: { primaryName: "asc" },
        take: 80,
      }),
      prisma.kgEdge.findMany({
        where: {
          OR: [
            { sourceNode: { type: { in: ["persona", "proyecto"] } } },
            { targetNode: { type: { in: ["persona", "proyecto"] } } },
          ],
        },
        take: 400,
      }),
      listProjects(),
      prisma.notebook.findMany({
        orderBy: { updatedAt: "desc" },
        take: 40,
        select: {
          id: true,
          title: true,
          description: true,
          kind: true,
        },
      }),
      ensureOperatorPersonaNode(),
    ]);

  const nodes: SemanticMapNode[] = [
    {
      id: YO_ID,
      label: operator?.primaryName ?? "YO",
      kind: "yo",
      deepLink: "/ludus/castillo",
      degree: 0,
      subtitle:
        universeSlug && universeSlug !== "babel" ? universeSlug : "Corpus",
    },
  ];

  const nodeIdSet = new Set<string>([YO_ID]);

  for (const persona of personaNodes) {
    // El hub YO ya representa al Operador; no duplicar su persona KG.
    if (operator && persona.id === operator.id) continue;
    nodes.push({
      id: persona.id,
      label: persona.primaryName,
      kind: "persona",
      deepLink: `/grafo?node=${persona.id}`,
      degree: 0,
    });
    nodeIdSet.add(persona.id);
  }

  const projectIdsSeen = new Set<string>();

  for (const proyecto of proyectoKgNodes) {
    projectIdsSeen.add(proyecto.id);
    nodes.push({
      id: proyecto.id,
      label: proyecto.primaryName,
      kind: "proyecto",
      deepLink: projectDeepLink(proyecto.id),
      degree: 0,
    });
    nodeIdSet.add(proyecto.id);
  }

  for (const project of projects.slice(0, 60)) {
    if (projectIdsSeen.has(project.id)) continue;
    const match = proyectoKgNodes.find(
      (n) => n.primaryName.toLowerCase() === project.title.toLowerCase(),
    );
    if (match) continue;

    nodes.push({
      id: `project:${project.id}`,
      label: project.title,
      kind: "proyecto",
      deepLink: projectDeepLink(project.id),
      degree: 0,
      subtitle: project.campo ?? null,
    });
    nodeIdSet.add(`project:${project.id}`);
  }

  for (const notebook of notebooks) {
    nodes.push({
      id: `cuaderno:${notebook.id}`,
      label: notebook.title,
      kind: "cuaderno",
      deepLink: `/ingesta/cuadernos/${notebook.id}`,
      degree: 0,
      subtitle: notebook.kind,
    });
    nodeIdSet.add(`cuaderno:${notebook.id}`);
  }

  const edges: SemanticMapEdge[] = [];
  const edgeKeySet = new Set<string>();

  function addEdge(
    id: string,
    source: string,
    target: string,
    relationType: string,
    synthetic = false,
  ) {
    if (!nodeIdSet.has(source) || !nodeIdSet.has(target)) return;
    const key = `${source}|${target}|${relationType}`;
    if (edgeKeySet.has(key)) return;
    edgeKeySet.add(key);
    edges.push({ id, source, target, relationType, synthetic });
  }

  for (const edge of kgEdges) {
    addEdge(edge.id, edge.sourceNodeId, edge.targetNodeId, edge.relationType);
  }

  const projectNodes = nodes.filter((n) => n.kind === "proyecto").slice(0, 12);
  for (const project of projectNodes) {
    addEdge(`yo-project-${project.id}`, YO_ID, project.id, "orbita", true);
  }

  const personaSlice = nodes.filter((n) => n.kind === "persona").slice(0, 16);
  for (const persona of personaSlice) {
    addEdge(`yo-persona-${persona.id}`, YO_ID, persona.id, "conoce", true);
  }

  const degreeMap = new Map<string, number>();
  for (const edge of edges) {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1);
  }
  for (const node of nodes) {
    node.degree = degreeMap.get(node.id) ?? 0;
  }

  return {
    nodes,
    edges,
    universe: universeSlug,
  };
}
