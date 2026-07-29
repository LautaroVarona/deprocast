"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { XIcon, Loader2Icon, FlaskConicalIcon, TagIcon } from "lucide-react";
import {
  addThreadContext,
  removeThreadContext,
  coagulateDaySession,
} from "@/lib/jornada/actions";

type ContextTag = {
  id: string;
  tagType: string;
  tagId: string;
  tagLabel: string;
};

type Props = {
  sessionId: string;
  threadId: string | null;
  contexts: ContextTag[];
  isClosed: boolean;
  summaryMarkdown: string | null;
  onUpdated: () => void;
};

const MOCK_OPTIONS: { tagType: string; tagId: string; tagLabel: string }[] = [
  { tagType: "universo", tagId: "deprocast", tagLabel: "Deprocast" },
  { tagType: "universo", tagId: "babel", tagLabel: "Babel" },
  { tagType: "proyecto", tagId: "atanor", tagLabel: "Atanor Temporal" },
  { tagType: "proyecto", tagId: "ludus", tagLabel: "Ludus" },
  { tagType: "persona", tagId: "operador", tagLabel: "Operador" },
  { tagType: "persona", tagId: "exocortex", tagLabel: "Exocórtex" },
];

export function ContextInspector({
  sessionId,
  threadId,
  contexts,
  isClosed,
  summaryMarkdown,
  onUpdated,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [isCoagulating, setIsCoagulating] = useState(false);
  const [coagError, setCoagError] = useState<string | null>(null);

  function handleAddTag(opt: (typeof MOCK_OPTIONS)[0]) {
    if (!threadId) return;
    startTransition(async () => {
      await addThreadContext(threadId, opt.tagType, opt.tagId, opt.tagLabel);
      onUpdated();
    });
  }

  function handleRemoveTag(contextId: string) {
    startTransition(async () => {
      await removeThreadContext(contextId);
      onUpdated();
    });
  }

  async function handleCoagulate() {
    setIsCoagulating(true);
    setCoagError(null);
    const result = await coagulateDaySession(sessionId);
    setIsCoagulating(false);
    if (!result.ok) {
      setCoagError(result.error);
    } else {
      onUpdated();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 px-3 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400/80">
          Inspector
        </p>
      </div>

      {/* Context Tags */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          Contexto del hilo
        </p>

        {threadId ? (
          <>
            {/* Active tags */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {contexts.map((ctx) => (
                <motion.span
                  key={ctx.id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-300"
                >
                  <TagIcon className="size-2.5 text-amber-400/60" />
                  <span className="font-mono text-[9px] uppercase text-zinc-500">
                    {ctx.tagType}
                  </span>
                  {ctx.tagLabel}
                  {!isClosed && (
                    <button
                      onClick={() => handleRemoveTag(ctx.id)}
                      className="ml-0.5 text-zinc-500 hover:text-red-400"
                    >
                      <XIcon className="size-2.5" />
                    </button>
                  )}
                </motion.span>
              ))}
              {contexts.length === 0 && (
                <span className="text-[11px] text-zinc-600">
                  Sin tags anclados.
                </span>
              )}
            </div>

            {/* Add tags */}
            {!isClosed && (
              <div className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                  Añadir
                </p>
                <div className="flex flex-wrap gap-1">
                  {MOCK_OPTIONS.filter(
                    (opt) =>
                      !contexts.some(
                        (c) =>
                          c.tagType === opt.tagType && c.tagId === opt.tagId,
                      ),
                  ).map((opt) => (
                    <button
                      key={`${opt.tagType}-${opt.tagId}`}
                      onClick={() => handleAddTag(opt)}
                      disabled={isPending}
                      className="rounded border border-zinc-800 bg-zinc-900/50 px-2 py-0.5 text-[11px] text-zinc-400 transition-colors hover:border-amber-500/30 hover:text-zinc-200 disabled:opacity-40"
                    >
                      {opt.tagLabel}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-[11px] text-zinc-600">
            Seleccioná un hilo para ver su contexto.
          </p>
        )}

        {/* Summary preview */}
        {summaryMarkdown && (
          <div className="mt-4">
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-400/60">
              Resumen coagulado
            </p>
            <div className="max-h-60 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-900/50 p-2.5 font-mono text-[11px] leading-relaxed text-zinc-400 whitespace-pre-wrap">
              {summaryMarkdown.slice(0, 3000)}
            </div>
          </div>
        )}
      </div>

      {/* Coagulate button */}
      <div className="border-t border-zinc-800 p-3">
        {coagError && (
          <p className="mb-2 text-xs text-red-400">{coagError}</p>
        )}
        <button
          onClick={handleCoagulate}
          disabled={isClosed || isCoagulating}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/20 py-3 font-mono text-sm font-semibold tracking-wide text-amber-300 transition-all hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isCoagulating ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Coagulando…
            </>
          ) : isClosed ? (
            <>
              <FlaskConicalIcon className="size-4" />
              Jornada cerrada
            </>
          ) : (
            <>
              <FlaskConicalIcon className="size-4" />
              Coagular Jornada (Cerrar Día)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
