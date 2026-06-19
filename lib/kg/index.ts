export * from "@/lib/kg/types";
export { normalizeName, namesMatchFuzzy, mapLegacyEntityType } from "@/lib/kg/normalize";
export { KG_EXTRACT_PROMPT } from "@/lib/kg/prompts";
export { parseLlmKgExtraction } from "@/lib/kg/parse";
export {
  resolveEntities,
  mergeAliases,
  resolveNameToId,
  createDualNatureEdges,
} from "@/lib/kg/identity";
export { createEdgesFromExtraction } from "@/lib/kg/edges";
export { createMentionsFromExtraction } from "@/lib/kg/mentions";
export { extractKgFromText } from "@/lib/kg/extract";
export { ingestKgExtraction } from "@/lib/kg/ingest";
export {
  searchNodes,
  getNodeById,
  getNeighborhood,
  getMentionsForSource,
  getDuplicateCandidates,
} from "@/lib/kg/queries";
export { mergeNodes } from "@/lib/kg/merge";
export {
  ingestIfChanged,
  sourceHasChanged,
  recordSourceIngestion,
  hashContent,
} from "@/lib/kg/incremental";
export { scanCodeGraph } from "@/lib/kg/code/scan";
export { ingestCodeGraph } from "@/lib/kg/code/ingest";
export {
  ingestDocumentSource,
  ingestJournalEntries,
  ingestProjects,
  ingestRawDocuments,
  ingestMasterPlan,
} from "@/lib/kg/sources";
export {
  getProjectPeople,
  getRelatedProjects,
  getRepeatedIdeas,
  getCodeDependencies,
  getCentralityRanking,
  getGraphSnapshot,
  getKgStats,
} from "@/lib/kg/analytics";
export { exportGraphJson, exportGraphML } from "@/lib/kg/export";
export { reconcileLegacyEntities, type ReconcileReport } from "@/lib/kg/reconcile-legacy";
