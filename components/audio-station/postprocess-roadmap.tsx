"use client";

import { POSTPROCESS_PIPELINE } from "@/lib/audio-station/constants";
import { cn } from "@/lib/utils";
import { GitBranchIcon } from "lucide-react";
import Link from "next/link";

export function PostprocessRoadmap() {
  return (
    <section className="audio-noir-panel space-y-4 p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <GitBranchIcon className="size-4 text-violet-400/80" />
          <h2 className="font-mono text-sm font-medium text-white/90">
            Post-procesamiento downstream
          </h2>
        </div>
        <p className="max-w-2xl font-mono text-[10px] leading-relaxed text-white/45">
          La data extraída del STT alimenta segmentación, clasificación,
          organización molecular y el grafo. Cada etapa es un agente distinto en
          el ecosistema Deprocast.
        </p>
      </div>

      <ol className="relative space-y-0">
        {POSTPROCESS_PIPELINE.map((stage, index) => {
          const isFirst = index === 0;
          const isLast = index === POSTPROCESS_PIPELINE.length - 1;

          return (
            <li key={stage.id} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast ? (
                <span
                  className="absolute top-6 left-[11px] h-[calc(100%-12px)] w-px bg-gradient-to-b from-white/20 to-white/5"
                  aria-hidden
                />
              ) : null}

              <span
                className={cn(
                  "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[9px]",
                  isFirst
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : "border-white/15 bg-black/40 text-white/45",
                )}
              >
                {index + 1}
              </span>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-[11px] text-white/85">
                    {stage.label}
                  </p>
                  {stage.route ? (
                    <Link
                      href={stage.route}
                      className="font-mono text-[9px] text-sky-400/80 underline-offset-2 hover:underline"
                    >
                      abrir →
                    </Link>
                  ) : null}
                </div>
                <p className="font-mono text-[9px] leading-relaxed text-white/40">
                  {stage.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
