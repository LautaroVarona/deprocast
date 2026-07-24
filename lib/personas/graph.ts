import { parseAliasesJson, parseMetadataJson } from "@/lib/kg/normalize";
import { listCampos } from "@/lib/projects/service";
import { toPersonaGraphEdge } from "@/lib/personas/mappers";
import type {
  PersonaGraphSnapshot,
  PersonaGraphViewMode,
} from "@/lib/personas/model";
import { prisma } from "@/lib/prisma";
import { ensureOperatorPersonaNode } from "@/lib/yo/operator-node";

const PERSONA_PROJECT_RELATIONS = [
  "responsable_de",
  "participa_en",
  "trabaja_en",
  "colabora_con",
  "relacionado_con",
  "menciona_a",
  "cliente_de",
  "subordinado_de",
] as const;

const PERSONA_PERSONA_RELATIONS = [
  "colabora_con",
  "subordinado_de",
  "relacionado_con",
  "menciona_a",
  "cliente_de",
  "competidor_de",
] as const;

const PERSONA_CAMPO_RELATIONS = ["pertenece_a", "trabaja_en", "relacionado_con"] as const;

function isCampoConcepto(metadata: Record<string, unknown>): boolean {
  return typeof metadata.campoSlug === "string" && metadata.campoSlug.length > 0;
}

export async function buildPersonaGraphSnapshot(
  mode: PersonaGraphViewMode,
): Promise<PersonaGraphSnapshot> {
  const operatorNode = await ensureOperatorPersonaNode();
  const centerNodeId = operatorNode?.id ?? null;

  const personaNodes = await prisma.kgNode.findMany({
    where: { type: "persona", reconocido: true },
    orderBy: { primaryName: "asc" },
  });

  if (
    centerNodeId &&
    !personaNodes.some((node) => node.id === centerNodeId)
  ) {
    const hub = await prisma.kgNode.findUnique({ where: { id: centerNodeId } });
    if (hub) personaNodes.unshift(hub);
  }

  const personaIds = new Set(personaNodes.map((node) => node.id));

  const personaPersonaEdges = await prisma.kgEdge.findMany({
    where: {
      relationType: { in: [...PERSONA_PERSONA_RELATIONS] },
      sourceNode: { type: "persona" },
      targetNode: { type: "persona" },
    },
    include: { sourceNode: true, targetNode: true },
  });

  let projectNodes: Awaited<ReturnType<typeof prisma.kgNode.findMany>> = [];
  let campoNodes: Awaited<ReturnType<typeof prisma.kgNode.findMany>> = [];
  let personaProjectEdges: typeof personaPersonaEdges = [];
  let personaCampoEdges: typeof personaPersonaEdges = [];

  if (mode === "mixed") {
    personaProjectEdges = await prisma.kgEdge.findMany({
      where: {
        relationType: { in: [...PERSONA_PROJECT_RELATIONS] },
        OR: [
          { sourceNode: { type: "persona" }, targetNode: { type: "proyecto" } },
          { sourceNode: { type: "proyecto" }, targetNode: { type: "persona" } },
        ],
      },
      include: { sourceNode: true, targetNode: true },
    });

    personaCampoEdges = await prisma.kgEdge.findMany({
      where: {
        relationType: { in: [...PERSONA_CAMPO_RELATIONS] },
        OR: [
          { sourceNode: { type: "persona" }, targetNode: { type: "concepto" } },
          { sourceNode: { type: "concepto" }, targetNode: { type: "persona" } },
        ],
      },
      include: { sourceNode: true, targetNode: true },
    });

    projectNodes = await prisma.kgNode.findMany({
      where: { type: "proyecto" },
      orderBy: { primaryName: "asc" },
    });

    const campos = await listCampos();
    const allConceptos = await prisma.kgNode.findMany({
      where: { type: "concepto" },
    });
    const campoNodeBySlug = new Map<string, (typeof allConceptos)[number]>();
    for (const node of allConceptos) {
      const metadata = parseMetadataJson(node.metadata);
      if (isCampoConcepto(metadata)) {
        campoNodeBySlug.set(metadata.campoSlug as string, node);
      }
    }
    campoNodes = campos
      .map((campo) => campoNodeBySlug.get(campo.slug))
      .filter((node): node is NonNullable<typeof node> => node !== undefined);
  }

  const degree = new Map<string, number>();
  const graphEdges = [
    ...personaPersonaEdges.map((edge) =>
      toPersonaGraphEdge(edge, edge.sourceNode, edge.targetNode),
    ),
    ...(mode === "mixed"
      ? [
          ...personaProjectEdges.map((edge) =>
            toPersonaGraphEdge(edge, edge.sourceNode, edge.targetNode),
          ),
          ...personaCampoEdges
            .map((edge) => toPersonaGraphEdge(edge, edge.sourceNode, edge.targetNode))
            .filter((edge): edge is NonNullable<typeof edge> => edge !== null),
        ]
      : []),
  ].filter((edge): edge is NonNullable<typeof edge> => edge !== null);

  for (const edge of graphEdges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }

  const nodes = [
    ...personaNodes.map((node) => ({
      id: node.id,
      nombrePrincipal: node.primaryName,
      kind: "persona" as const,
      aliases: parseAliasesJson(node.aliases),
      degree: degree.get(node.id) ?? 0,
      isCenter: node.id === centerNodeId,
    })),
    ...(mode === "mixed"
      ? [
          ...projectNodes.map((node) => ({
            id: node.id,
            nombrePrincipal: node.primaryName,
            kind: "proyecto" as const,
            aliases: parseAliasesJson(node.aliases),
            degree: degree.get(node.id) ?? 0,
          })),
          ...campoNodes.map((node) => {
            const metadata = parseMetadataJson(node.metadata);
            return {
              id: node.id,
              nombrePrincipal: node.primaryName,
              kind: "campo" as const,
              aliases: parseAliasesJson(node.aliases),
              degree: degree.get(node.id) ?? 0,
              campoSlug:
                typeof metadata.campoSlug === "string" ? metadata.campoSlug : null,
            };
          }),
        ]
      : []),
  ];

  const filteredEdges =
    mode === "exclusive"
      ? graphEdges.filter(
          (edge) =>
            edge.kind === "persona-persona" &&
            personaIds.has(edge.source) &&
            personaIds.has(edge.target),
        )
      : graphEdges.filter((edge) => {
          if (edge.kind === "persona-persona") {
            return personaIds.has(edge.source) && personaIds.has(edge.target);
          }
          if (edge.kind === "persona-proyecto" || edge.kind === "persona-campo") {
            return personaIds.has(edge.source) || personaIds.has(edge.target);
          }
          return true;
        });

  return {
    mode,
    centerNodeId: personaIds.has(centerNodeId ?? "") ? centerNodeId : null,
    nodes,
    edges: filteredEdges,
  };
}
