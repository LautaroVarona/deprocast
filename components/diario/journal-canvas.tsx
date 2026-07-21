"use client";

import { JOURNAL_WAVE_TABS } from "@/components/diario/constants";
import { JournalEntryPreview } from "@/components/diario/journal-entry-preview";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { JournalEntryDetail, JournalOnda } from "@/lib/journal/types";
import { cn } from "@/lib/utils";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type JournalCanvasProps = {
  activeOnda: JournalOnda;
  content: string;
  purifyOnSave: boolean;
  isSaving: boolean;
  previewEntry: JournalEntryDetail | null;
  isPreviewLoading: boolean;
  onOndaChange: (onda: JournalOnda) => void;
  onContentChange: (content: string) => void;
  onPurifyToggle: (enabled: boolean) => void;
  onSave: () => void;
  onClosePreview: () => void;
};

export function JournalCanvas({
  activeOnda,
  content,
  purifyOnSave,
  isSaving,
  previewEntry,
  isPreviewLoading,
  onOndaChange,
  onContentChange,
  onPurifyToggle,
  onSave,
  onClosePreview,
}: JournalCanvasProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [modifierKey, setModifierKey] = useState("Ctrl");
  const activeTab = JOURNAL_WAVE_TABS.find((tab) => tab.id === activeOnda)!;
  const canSave = content.trim().length > 0 && !isSaving;

  useEffect(() => {
    setModifierKey(
      typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
        ? "⌘"
        : "Ctrl",
    );
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (canSave) onSave();
      }
    },
    [canSave, onSave],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <section className="flex min-w-0 flex-[70] flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border px-4 py-2">
        <p className="mb-2 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Lienzo de Enfoque · Babel
        </p>
        <div
          className="flex flex-wrap gap-1"
          role="tablist"
          aria-label="Frecuencia de onda"
        >
          {JOURNAL_WAVE_TABS.map((tab) => {
            const isActive = activeOnda === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onOndaChange(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] transition-all duration-150",
                  isActive
                    ? "bg-primary/90 text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span aria-hidden>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <JournalEntryPreview
        entry={previewEntry}
        isLoading={isPreviewLoading}
        onClose={onClosePreview}
      />

      <div className="min-h-0 flex-1 p-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          placeholder={activeTab.placeholder}
          className="h-full w-full resize-none bg-transparent font-mono text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
          spellCheck={false}
        />
      </div>

      <footer className="shrink-0 border-t border-border px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <Kbd>
              {modifierKey}
              {" + Enter"}
            </Kbd>
            <span>Coagular Entrada</span>
            {content.trim().length > 0 && (
              <span className="text-muted-foreground/70">
                · {content.trim().length.toLocaleString("es-AR")} caracteres
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 transition-colors hover:bg-muted/50">
              <input
                type="checkbox"
                checked={purifyOnSave}
                onChange={(event) => onPurifyToggle(event.target.checked)}
                className="size-3.5 rounded border-input accent-primary"
              />
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                <SparklesIcon className="size-3" />
                Coagular y Enviar a Purificación
              </span>
            </label>

            <Button
              type="button"
              size="sm"
              disabled={!canSave}
              onClick={onSave}
              className="active:scale-[0.98] transition-transform"
            >
              {isSaving ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              {isSaving
                ? "Fijando…"
                : purifyOnSave
                  ? "Fijar y Purificar"
                  : "Fijar en la Torre de Babel"}
            </Button>
          </div>
        </div>
      </footer>
    </section>
  );
}
