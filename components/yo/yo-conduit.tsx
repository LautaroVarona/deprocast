"use client";

import {
  listConduitAction,
  sendConduitAction,
} from "@/app/yo/actions";
import type { YoConduitMessageDto, YoDto } from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

type YoConduitProps = {
  yo: YoDto;
};

export function YoConduit({ yo }: YoConduitProps) {
  const [messages, setMessages] = useState<YoConduitMessageDto[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const result = await listConduitAction();
    if (result.ok) setMessages(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async () => {
    const content = draft.trim();
    if (!content || busy) return;
    setBusy(true);
    setError(null);
    setDraft("");
    const result = await sendConduitAction(content);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      setDraft(content);
      return;
    }
    setMessages(result.data.messages);
    inputRef.current?.focus();
  };

  return (
    <section className="yo-noir-panel flex min-h-[22rem] flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-accent/20 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.28em] text-accent uppercase">
            Conducto · Canal directo
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {yo.operatorName} ↔ {yo.exocortexName} · sin filtros
          </p>
        </div>
        <span className="font-mono text-[9px] tracking-[0.18em] text-chart-3 uppercase">
          [ ENLACE ABIERTO ]
        </span>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-black/35 px-4 py-3 font-mono text-[12px] leading-relaxed">
        {messages.length === 0 ? (
          <p className="text-muted-foreground">
            <span className="text-accent">{yo.exocortexName}&gt;</span> Conducto
            listo. Emití un comando o consulta.
          </p>
        ) : (
          messages.map((message) => {
            const prefix =
              message.role === "operator"
                ? `${yo.operatorName}`
                : message.role === "exocortex"
                  ? `${yo.exocortexName}`
                  : "SYSTEM";
            return (
              <p key={message.id} className="whitespace-pre-wrap break-words">
                <span
                  className={cn(
                    "mr-2",
                    message.role === "exocortex"
                      ? "text-accent"
                      : message.role === "operator"
                        ? "text-chart-2"
                        : "text-muted-foreground",
                  )}
                >
                  {prefix}&gt;
                </span>
                <span className="text-foreground/90">{message.content}</span>
              </p>
            );
          })
        )}
        {busy ? (
          <p className="animate-pulse text-accent">
            {yo.exocortexName}&gt; procesando…
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="border-t border-accent/20 p-3">
        <div className="flex items-center gap-2 border border-accent/30 bg-black/40 px-3">
          <span className="shrink-0 font-mono text-accent">{">"}</span>
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            disabled={busy}
            placeholder="comando / consulta al exocórtex…"
            className="min-h-11 w-full bg-transparent font-mono text-sm text-accent outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="button"
            disabled={busy || !draft.trim()}
            onClick={() => void send()}
            className="shrink-0 font-mono text-[10px] tracking-[0.16em] text-accent uppercase disabled:opacity-40"
          >
            TX
          </button>
        </div>
        {error ? (
          <p className="mt-2 font-mono text-[11px] text-destructive">{error}</p>
        ) : null}
      </div>
    </section>
  );
}
