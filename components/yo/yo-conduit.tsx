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
  missionMode?: boolean;
  onYoUpdate?: (yo: YoDto) => void;
  registerFocus?: (focus: () => void) => void;
};

export function YoConduit({
  yo,
  missionMode = false,
  onYoUpdate,
  registerFocus,
}: YoConduitProps) {
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
    // Releer al sellar génesis (mensaje de bienvenida a la Legión).
    if (yo.genesisStatus === "COMPLETED") {
      void load();
    }
  }, [yo.genesisStatus, yo.updatedAt, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    registerFocus?.(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [registerFocus]);

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
    onYoUpdate?.(result.data.yo);
    inputRef.current?.focus();
  };

  const activeNosce = yo.consecration.activeMissionId === "nosce";

  return (
    <section className="yo-noir-panel flex min-h-[22rem] flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-accent/20 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.28em] text-accent uppercase">
            Conducto · Canal directo
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {yo.operatorName} ↔ {yo.exocortexName}
            {missionMode ? " · consagración" : " · sin filtros"}
          </p>
        </div>
        <span className="font-mono text-[9px] tracking-[0.18em] text-chart-3 uppercase">
          {missionMode && activeNosce
            ? "[ NOSCE ACTIVO ]"
            : "[ ENLACE ABIERTO ]"}
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
          <p className="text-muted-foreground">
            <span className="text-accent">{yo.exocortexName}&gt;</span> …
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="border-t border-accent/20 p-3">
        {error ? (
          <p className="mb-2 font-mono text-[11px] text-destructive">{error}</p>
        ) : null}
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={busy}
            placeholder={
              missionMode && activeNosce
                ? "Respondé la pregunta de Nosce…"
                : "Emití al Conducto…"
            }
            className="min-w-0 flex-1 border border-accent/25 bg-black/40 px-3 py-2 font-mono text-[12px] text-foreground outline-none focus:border-accent/55"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="border border-accent/40 bg-accent/10 px-3 py-2 font-mono text-[10px] tracking-[0.18em] text-accent uppercase disabled:opacity-40"
          >
            TX
          </button>
        </form>
      </div>
    </section>
  );
}
