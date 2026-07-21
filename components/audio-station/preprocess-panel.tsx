"use client";

import { DeduplicatePanel } from "@/components/audio-station/deduplicate-panel";
import { PREPROCESS_TOOLS } from "@/lib/audio-station/constants";
import { cn } from "@/lib/utils";
import { SlidersHorizontalIcon } from "lucide-react";

export function PreprocessPanel() {
  return (
    <section className="space-y-4">
      <div className="audio-noir-panel p-4">
        <div className="mb-4 flex items-center gap-2">
          <SlidersHorizontalIcon className="size-4 text-primary" />
          <h2 className="font-mono text-sm font-medium text-muted-foreground">
            Herramientas de pre-procesamiento
          </h2>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {PREPROCESS_TOOLS.filter((tool) => tool.id !== "deduplicate").map(
            (tool) => (
              <div
                key={tool.id}
                className={cn(
                  "rounded border px-3 py-2.5 transition-colors",
                  tool.status === "available"
                    ? "border-primary/25 bg-primary/5"
                    : "border-border bg-muted/40 opacity-80",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {tool.label}
                  </p>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider",
                      tool.status === "available"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {tool.status === "planned" ? "próximo" : tool.status}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted-foreground">
                  {tool.description}
                </p>
              </div>
            ),
          )}
        </div>

        <p className="mt-3 font-mono text-[10px] text-muted-foreground">
          El foco operativo sigue siendo STT (Deepgram) y la extracción máxima
          de datos del audio. ENR y recorte de silencios se integrarán antes de
          encolar.
        </p>
      </div>

      <DeduplicatePanel />
    </section>
  );
}
