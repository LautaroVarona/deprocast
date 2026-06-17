import { prisma } from "@/lib/prisma";
import { parseAliasesJson, parseMetadataJson } from "@/lib/kg/normalize";

export type GraphExportJson = {
  generatedAt: string;
  nodes: {
    id: string;
    primaryName: string;
    type: string;
    aliases: string[];
    metadata: Record<string, unknown>;
    confidence: number;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    relationType: string;
    context: string;
    weight: number | null;
    confidence: number;
  }[];
};

export async function exportGraphJson(): Promise<GraphExportJson> {
  const [nodes, edges] = await Promise.all([
    prisma.kgNode.findMany(),
    prisma.kgEdge.findMany(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    nodes: nodes.map((node) => ({
      id: node.id,
      primaryName: node.primaryName,
      type: node.type,
      aliases: parseAliasesJson(node.aliases),
      metadata: parseMetadataJson(node.metadata),
      confidence: node.confidence,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      relationType: edge.relationType,
      context: edge.context,
      weight: edge.weight,
      confidence: edge.confidence,
    })),
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Exporta el grafo en GraphML (compatible con Gephi, yEd, Cytoscape). */
export async function exportGraphML(): Promise<string> {
  const data = await exportGraphJson();

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
    '  <key id="name" for="node" attr.name="name" attr.type="string"/>',
    '  <key id="type" for="node" attr.name="type" attr.type="string"/>',
    '  <key id="confidence" for="node" attr.name="confidence" attr.type="double"/>',
    '  <key id="relation" for="edge" attr.name="relation" attr.type="string"/>',
    '  <key id="weight" for="edge" attr.name="weight" attr.type="int"/>',
    '  <key id="context" for="edge" attr.name="context" attr.type="string"/>',
    '  <graph id="deprocast-kg" edgedefault="directed">',
  ];

  for (const node of data.nodes) {
    lines.push(`    <node id="${escapeXml(node.id)}">`);
    lines.push(`      <data key="name">${escapeXml(node.primaryName)}</data>`);
    lines.push(`      <data key="type">${escapeXml(node.type)}</data>`);
    lines.push(`      <data key="confidence">${node.confidence}</data>`);
    lines.push("    </node>");
  }

  for (const edge of data.edges) {
    lines.push(
      `    <edge id="${escapeXml(edge.id)}" source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}">`,
    );
    lines.push(`      <data key="relation">${escapeXml(edge.relationType)}</data>`);
    if (edge.weight != null) {
      lines.push(`      <data key="weight">${edge.weight}</data>`);
    }
    lines.push(`      <data key="context">${escapeXml(edge.context)}</data>`);
    lines.push("    </edge>");
  }

  lines.push("  </graph>");
  lines.push("</graphml>");

  return lines.join("\n");
}
