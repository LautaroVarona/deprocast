import { createEdgesFromExtraction } from "@/lib/kg/edges";
import {
  createDualNatureEdges,
  resolveEntities,
} from "@/lib/kg/identity";
import { createMentionsFromExtraction } from "@/lib/kg/mentions";
import type { IngestInput, IngestResult } from "@/lib/kg/types";

export async function ingestKgExtraction(input: IngestInput): Promise<IngestResult> {
  const { extraction, source } = input;

  const nameToIdMap = await resolveEntities(extraction.entities);
  const dualEdgeIds = await createDualNatureEdges(extraction.entities, nameToIdMap);
  const relationEdgeIds = await createEdgesFromExtraction(
    extraction.relations,
    nameToIdMap,
  );
  const mentionIds = await createMentionsFromExtraction(
    extraction.entities,
    nameToIdMap,
    source,
  );

  const nodeIds = [...new Set(nameToIdMap.values())];
  const edgeIds = [...new Set([...dualEdgeIds, ...relationEdgeIds])];
  const resolved = Object.fromEntries(nameToIdMap.entries());

  return {
    nodeIds,
    edgeIds,
    mentionIds,
    resolved,
  };
}
