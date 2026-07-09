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
          <SlidersHorizontalIcon className="size-4 text-violet-400/80" />
          <h2 className="font-mono text-sm font-medium text-white/90">
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
                    ? "border-emerald-500/25 bg-emerald-500/5"
                    : "border-white/8 bg-black/20 opacity-80",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[11px] text-white/85">
                    {tool.label}
                  </p>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider",
                      tool.status === "available"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-white/8 text-white/40",
                    )}
                  >
                    {tool.status === "planned" ? "próximo" : tool.status}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[9px] leading-relaxed text-white/40">
                  {tool.description}
                </p>
              </div>
            ),
          )}
        </div>

        <p className="mt-3 font-mono text-[9px] text-white/30">
          El foco operativo sigue siendo STT (Deepgram) y la extracción máxima
          de datos del audio. ENR y recorte de silencios se integrarán antes de
          encolar.
        </p>
      </div>

      <DeduplicatePanel />
    </section>
  );
}
