"use client";

import { KnowledgeCard } from "@/components/cortex/knowledge-card";
import { Card, CardContent } from "@/components/ui/card";
import { matchesAreaFilter } from "@/lib/meta-meteador/area-theme";
import type { CortexNode } from "@/lib/cortex/types";
import type { MetaArea } from "@/lib/meta-meteador/types";
import { BrainIcon } from "lucide-react";
import { useMemo } from "react";

type KnowledgeGridProps = {
  nodes: CortexNode[];
  activeArea: MetaArea | null;
  isLoading?: boolean;
};

export function KnowledgeGrid({
  nodes,
  activeArea,
  isLoading,
}: KnowledgeGridProps) {
  const filteredNodes = useMemo(() => {
    if (!activeArea) return nodes;
    return nodes.filter((node) => matchesAreaFilter(node.areas, activeArea));
  }, [nodes, activeArea]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Card key={index} className="h-44 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  if (filteredNodes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <BrainIcon className="size-8 text-muted-foreground" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {activeArea
                ? `Sin nodos con señal en ${activeArea}`
                : "El Córtex está vacío"}
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              {activeArea
                ? "Probá otro filtro o ingestá nuevo estímulo para ampliar el corpus."
                : "Ingestá audios, documentos o dumps de chat. Una vez validados y procesados por Meta-Meteador, aparecerán acá como tarjetas de conocimiento."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {filteredNodes.map((node) => (
        <KnowledgeCard key={node.id} node={node} />
      ))}
    </div>
  );
}
