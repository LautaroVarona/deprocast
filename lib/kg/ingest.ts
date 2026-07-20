import { createEdgesFromExtraction } from "@/lib/kg/edges";
import {
  createDualNatureEdges,
  resolveEntities,
} from "@/lib/kg/identity";
import { createMentionsFromExtraction } from "@/lib/kg/mentions";
import type { IngestInput, IngestResult } from "@/lib/kg/types";

export async function ingestKgExtraction(input: IngestInput): Promise<IngestResult> {
  const { extraction, source } = input;
  const reconocido = input.reconocido ?? false;

  const nameToIdMap = await resolveEntities(extraction.entities, { reconocido });
  const dualEdgeIds = await createDualNatureEdges(
    extraction.entities,
    nameToIdMap,
    { reconocido },
  );
  const relationEdgeIds = await createEdgesFromExtraction(
    extraction.relations,
    nameToIdMap,
    { reconocido },
  );
  const mentionIds = await createMentionsFromExtraction(
    extraction.entities,
    nameToIdMap,
    source,
  );

  const nodeIds = [...new Set(nameToIdMap.values())];
  const edgeIds = [...new Set([...dualEdgeIds, ...relationEdgeIds])];
  const resolved = Object.fromEntries(nameToIdMap.entries());

  const result: IngestResult = {
    nodeIds,
    edgeIds,
    mentionIds,
    resolved,
  };

  void import("@/lib/historial/domain-log")
    .then(({ logKgIngestedActivity }) => logKgIngestedActivity(input, result))
    .catch((error) => {
      console.error("Historial KG ingest log error:", error);
    });

  return result;
}
