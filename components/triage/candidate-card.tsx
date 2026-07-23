"use client";

import type { EntityCandidateDto } from "@/lib/triage/types";
import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  AudioLinesIcon,
} from "lucide-react";

type CandidateCardProps = {
  candidate: EntityCandidateDto;
  style?: React.CSSProperties;
  className?: string;
  interactive?: boolean;
  exitHint?: "left" | "right" | "up" | null;
  onReject?: () => void;
  onApprove?: () => void;
  onMerge?: () => void;
};

function highlightSnippet(snippet: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return [{ text: snippet, highlight: false }];
  }

  const lower = snippet.toLowerCase();
  const needle = trimmed.toLowerCase();
  const index = lower.indexOf(needle);
  if (index < 0) {
    return [{ text: snippet, highlight: false }];
  }

  return [
    { text: snippet.slice(0, index), highlight: false },
    { text: snippet.slice(index, index + trimmed.length), highlight: true },
    { text: snippet.slice(index + trimmed.length), highlight: false },
  ].filter((part) => part.text.length > 0);
}

export function CandidateCard({
  candidate,
  style,
  className,
  interactive = false,
  exitHint = null,
  onReject,
  onApprove,
  onMerge,
}: CandidateCardProps) {
  const parts = highlightSnippet(candidate.contextSnippet, candidate.name);
  const isPerson = candidate.type === "PERSON";

  return (
    <article
      style={style}
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-2xl border-2 bg-[#0a0a0a] text-[#f5ebe0]",
        "border-[#ff6b35]/55 shadow-[0_0_0_1px_rgba(255,107,53,0.12),0_24px_60px_rgba(0,0,0,0.65)]",
        exitHint === "left" && "border-red-500/70",
        exitHint === "right" && "border-emerald-500/60",
        exitHint === "up" && "border-amber-400/70",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(#ff6b35 1px, transparent 1px), linear-gradient(90deg, #ff6b35 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {exitHint && (
        <div
          className={cn(
            "pointer-events-none absolute top-5 z-10 rounded border px-3 py-1 font-mono text-xs font-bold tracking-[0.2em] uppercase",
            exitHint === "left" &&
              "left-5 rotate-[-12deg] border-red-500 bg-red-500/15 text-red-400",
            exitHint === "right" &&
              "right-5 rotate-[12deg] border-emerald-500 bg-emerald-500/15 text-emerald-300",
            exitHint === "up" &&
              "top-4 left-1/2 -translate-x-1/2 border-amber-400 bg-amber-400/15 text-amber-300",
          )}
        >
          {exitHint === "left"
            ? "DESCARTAR"
            : exitHint === "right"
              ? "APROBAR"
              : "VINCULAR"}
        </div>
      )}

      <header className="relative z-[1] flex items-start justify-between gap-3 border-b border-[#ff6b35]/25 px-5 py-4">
        <div className="min-w-0 space-y-2">
          <span
            className={cn(
              "inline-flex rounded border px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] uppercase",
              isPerson
                ? "border-[#ff6b35]/50 bg-[#ff6b35]/10 text-[#ff8f5a]"
                : "border-amber-400/50 bg-amber-400/10 text-amber-300",
            )}
          >
            {isPerson ? "PERSONA" : "PROYECTO"}
          </span>
          <h2 className="truncate font-mono text-2xl font-semibold tracking-tight text-[#fff4ea]">
            {candidate.name}
          </h2>
        </div>
        {candidate.sourceId && (
          <div className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] text-[#ff6b35]/70">
            <AudioLinesIcon className="size-3.5" />
            SRC
          </div>
        )}
      </header>

      <div className="relative z-[1] flex flex-1 flex-col gap-3 px-5 py-4">
        <p className="font-mono text-[10px] tracking-[0.16em] text-[#ff6b35]/70 uppercase">
          Mastropiero detectó esto
        </p>
        <blockquote className="rounded-xl border border-[#ff6b35]/20 bg-black/50 px-4 py-3 font-mono text-sm leading-relaxed text-[#e8d7c8]">
          “
          {parts.map((part, index) =>
            part.highlight ? (
              <mark
                key={`${index}-${part.text}`}
                className="rounded-sm bg-[#ff6b35]/25 px-0.5 text-[#ff9a63] not-italic"
              >
                {part.text}
              </mark>
            ) : (
              <span key={`${index}-${part.text}`}>{part.text}</span>
            ),
          )}
          ”
        </blockquote>
        <p className="mt-auto font-mono text-[10px] text-[#a89888]">
          ← rechazar · → aprobar · ↑ vincular a existente
        </p>
      </div>

      {interactive && (
        <footer className="relative z-[1] grid grid-cols-3 gap-2 border-t border-[#ff6b35]/20 px-4 py-3">
          <button
            type="button"
            onClick={onReject}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-2 font-mono text-[10px] tracking-wider text-red-300 uppercase transition hover:bg-red-500/20"
          >
            <ArrowLeftIcon className="size-3.5" />
            No
          </button>
          <button
            type="button"
            onClick={onMerge}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 py-2 font-mono text-[10px] tracking-wider text-amber-200 uppercase transition hover:bg-amber-400/20"
          >
            <ArrowUpIcon className="size-3.5" />
            Link
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-2 font-mono text-[10px] tracking-wider text-emerald-200 uppercase transition hover:bg-emerald-500/20"
          >
            Sí
            <ArrowRightIcon className="size-3.5" />
          </button>
        </footer>
      )}
    </article>
  );
}
