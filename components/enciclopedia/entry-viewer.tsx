"use client";

import { useEnciclopedia } from "@/components/enciclopedia/enciclopedia-context";
import { cn } from "@/lib/utils";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";

type TextSegment = {
  text: string;
  term?: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitByTerms(text: string, terms: string[]): TextSegment[] {
  if (!text || terms.length === 0) {
    return [{ text }];
  }

  const sorted = [...terms]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const pattern = sorted.map(escapeRegExp).join("|");
  if (!pattern) return [{ text }];

  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex).filter((part) => part.length > 0);

  return parts.map((part) => {
    const matched = sorted.find(
      (term) => term.toLowerCase() === part.toLowerCase(),
    );
    return matched ? { text: part, term: matched } : { text: part };
  });
}

function renderInlineMarkdown(
  line: string,
  terms: string[],
  onExplore: (term: string) => void,
): ReactNode[] {
  const boldSplit = line.split(/(\*\*[^*]+\*\*)/g);
  const nodes: ReactNode[] = [];

  boldSplit.forEach((chunk, chunkIndex) => {
    const isBold = chunk.startsWith("**") && chunk.endsWith("**");
    const content = isBold ? chunk.slice(2, -2) : chunk;
    const segments = splitByTerms(content, terms);

    segments.forEach((segment, segmentIndex) => {
      const key = `${chunkIndex}-${segmentIndex}`;
      if (segment.term) {
        nodes.push(
          <button
            key={key}
            type="button"
            onClick={() => onExplore(segment.term!)}
            className="enciclopedia-term cursor-pointer border-0 bg-transparent p-0"
          >
            {segment.text}
          </button>,
        );
        return;
      }

      if (isBold) {
        nodes.push(
          <strong key={key} className="font-semibold text-white/95">
            {segment.text}
          </strong>,
        );
        return;
      }

      nodes.push(<span key={key}>{segment.text}</span>);
    });
  });

  return nodes;
}

function renderBody(
  body: string,
  terms: string[],
  onExplore: (term: string) => void,
): ReactNode {
  const lines = body.split("\n");

  return lines.map((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return <div key={index} className="h-3" />;
    }

    if (trimmed.startsWith("## ")) {
      return (
        <h3
          key={index}
          className="mb-2 mt-4 font-mono text-sm font-semibold text-amber-200/90"
        >
          {trimmed.slice(3)}
        </h3>
      );
    }

    if (trimmed.startsWith("### ")) {
      return (
        <h4
          key={index}
          className="mb-1 mt-3 font-mono text-xs font-medium uppercase tracking-wider text-white/70"
        >
          {trimmed.slice(4)}
        </h4>
      );
    }

    if (trimmed.startsWith("- ")) {
      return (
        <p key={index} className="mb-1 pl-4 text-sm leading-relaxed text-white/75">
          <span className="mr-2 text-amber-400/60">·</span>
          {renderInlineMarkdown(trimmed.slice(2), terms, onExplore)}
        </p>
      );
    }

    return (
      <p key={index} className="mb-2 text-sm leading-relaxed text-white/75">
        {renderInlineMarkdown(trimmed, terms, onExplore)}
      </p>
    );
  });
}

export function EntryViewer() {
  const {
    currentEntry,
    exploreConcept,
    explorationStack,
    goBack,
    isBusy,
  } = useEnciclopedia();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectionHint, setSelectionHint] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const breadcrumb = useMemo(
    () => explorationStack.map((entry) => entry.title),
    [explorationStack],
  );

  const handleExploreTerm = useCallback(
    async (term: string) => {
      if (!currentEntry || isBusy) return;
      await exploreConcept(term, {
        parentEntryId: currentEntry.id,
        triggerTerm: term,
      });
      setSelectionHint(null);
    },
    [currentEntry, exploreConcept, isBusy],
  );

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      setSelectionHint(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length < 2 || selectedText.length > 120) {
      setSelectionHint(null);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setSelectionHint(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setSelectionHint({
      text: selectedText,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
    });
  }, []);

  if (!currentEntry) {
    return (
      <section className="enciclopedia-noir-panel flex min-h-[320px] items-center justify-center p-8">
        <div className="max-w-sm space-y-2 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber-400/50">
            02 · Descubre
          </p>
          <p className="text-sm text-white/40">
            Tu primera explicación aparecerá acá. Subrayá términos sugeridos o
            seleccioná cualquier palabra para seguir el hilo.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="enciclopedia-noir-panel relative space-y-4 p-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-amber-400/60">
            02 · Descubre · 03 · Explora
          </p>
          {currentEntry.fromCache ? (
            <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-white/35">
              desde caché
            </span>
          ) : null}
        </div>

        {breadcrumb.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1 text-xs text-white/40">
            {breadcrumb.map((title, index) => (
              <span key={`${title}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <span className="text-white/20">→</span> : null}
                <span
                  className={cn(
                    index === breadcrumb.length - 1
                      ? "text-amber-200/80"
                      : "text-white/45",
                  )}
                >
                  {title}
                </span>
              </span>
            ))}
            <button
              type="button"
              onClick={goBack}
              className="ml-2 font-mono text-[10px] uppercase tracking-wider text-amber-400/70 hover:text-amber-300"
            >
              Volver
            </button>
          </div>
        ) : null}

        <h2 className="font-mono text-xl font-semibold text-white/95">
          {currentEntry.title}
        </h2>
      </div>

      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="relative max-h-[52vh] overflow-y-auto pr-1"
      >
        {renderBody(
          currentEntry.body,
          currentEntry.explorableTerms,
          (term) => {
            void handleExploreTerm(term);
          },
        )}

        {selectionHint ? (
          <button
            type="button"
            style={{
              left: selectionHint.x,
              top: selectionHint.y,
            }}
            onClick={() => void handleExploreTerm(selectionHint.text)}
            className={cn(
              "absolute z-10 -translate-x-1/2 -translate-y-full",
              "rounded-md border border-amber-500/40 bg-amber-500/90 px-2.5 py-1",
              "font-mono text-[10px] uppercase tracking-wider text-black shadow-lg",
              "hover:bg-amber-400",
            )}
          >
            Explorar «{selectionHint.text.slice(0, 32)}
            {selectionHint.text.length > 32 ? "…" : ""}»
          </button>
        ) : null}
      </div>

      {currentEntry.explorableTerms.length > 0 ? (
        <div className="border-t border-white/8 pt-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-white/35">
            Términos sugeridos
          </p>
          <div className="flex flex-wrap gap-2">
            {currentEntry.explorableTerms.map((term) => (
              <button
                key={term}
                type="button"
                disabled={isBusy}
                onClick={() => void handleExploreTerm(term)}
                className="enciclopedia-term-chip"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
