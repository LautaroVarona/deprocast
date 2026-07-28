export type GraphRagCoreHit = {
  quantomoId: string;
  kgNodeId: string | null;
  title: string;
  content: string;
  universo: string;
  tagsSemanticos: string[];
  score: number;
};

export type GraphRagOrbitConfirmed = {
  edgeId: string;
  weight: number;
  relationType: string;
  context: string;
  fromNodeId: string;
  toNodeId: string;
  neighbor: {
    id: string;
    primaryName: string;
    type: string;
    quantomoId: string | null;
    title: string | null;
    contentPreview: string | null;
  };
  seedQuantomoId: string;
};

export type GraphRagOrbitSuggested = {
  sourceQuantomoId: string;
  targetQuantomoId: string;
  sourceTitle: string;
  targetTitle: string;
  targetContentPreview: string;
  similarity: number;
  proposedWeight: number;
  edgeId?: string;
  status: "suggested";
};

export type GraphRagImpactZone = {
  query: string;
  core: GraphRagCoreHit[];
  orbit: {
    confirmed: GraphRagOrbitConfirmed[];
    suggested: GraphRagOrbitSuggested[];
  };
  meta: {
    coreLimit: number;
    highGravityMin: number;
    semanticThreshold: number;
    quantomosScanned: number;
  };
};
