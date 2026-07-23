"use client";

import { NameDecodeAnimation } from "@/components/yo/name-decode-animation";
import {
  baptizeExocortexAction,
  baptizeOperatorAction,
} from "@/app/yo/actions";
import type { YoDto } from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

type GenesisStep = "operator" | "exocortex" | "decoding";

type YoGenesisTerminalProps = {
  yo: YoDto;
  onComplete: (yo: YoDto) => void;
};

export function YoGenesisTerminal({ yo, onComplete }: YoGenesisTerminalProps) {
  const [step, setStep] = useState<GenesisStep>(() =>
    yo.operatorName?.trim() ? "exocortex" : "operator",
  );
  const [operatorName, setOperatorName] = useState(yo.operatorName ?? "");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decodedName, setDecodedName] = useState<string | null>(null);
  const [pendingYo, setPendingYo] = useState<YoDto | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const submitOperator = async () => {
    const name = input.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    const result = await baptizeOperatorAction(name);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOperatorName(result.data.operatorName ?? name);
    setInput("");
    setStep("exocortex");
  };

  const submitExocortex = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const provided = input.trim() || null;

    if (!provided) {
      setStep("decoding");
    }

    const result = await baptizeExocortexAction(provided);
    if (!result.ok) {
      setBusy(false);
      setStep("exocortex");
      setError(result.error);
      return;
    }

    if (result.data.namedBy === "autonomous") {
      setDecodedName(result.data.resolvedName);
      setPendingYo(result.data.yo);
      setBusy(false);
      setStep("decoding");
      return;
    }

    setBusy(false);
    onComplete(result.data.yo);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (step === "operator") void submitOperator();
    if (step === "exocortex") void submitExocortex();
  };

  return (
    <div className="yo-noir-root flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-10">
      <section className="yo-noir-panel w-full max-w-2xl space-y-6 p-5 md:p-8">
        <header className="space-y-2 border-b border-accent/20 pb-4">
          <p className="font-mono text-[10px] tracking-[0.32em] text-accent uppercase">
            Protocolo Génesis · Nodo Yo
          </p>
          <h1 className="font-mono text-2xl tracking-tight text-accent md:text-3xl">
            Inicialización de identidad dual
          </h1>
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
            Sin Operador no hay exoesqueleto. Sin Exocórtex no hay mando.
            Completá el bautismo para desbloquear el sistema.
          </p>
        </header>

        <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
          <p>
            <span className="text-accent">01</span> Operador:{" "}
            {operatorName.trim() || "— pendiente"}
          </p>
          <p>
            <span className="text-accent">02</span> Exocórtex:{" "}
            {decodedName ?? "— pendiente"}
          </p>
        </div>

        {step === "operator" || step === "exocortex" ? (
          <div className="space-y-4 border border-accent/25 bg-black/30 p-4">
            <p className="font-mono text-[10px] tracking-[0.22em] text-accent uppercase">
              {step === "operator" ? "Paso 1 · Bautismo" : "Paso 2 · Exocórtex"}
            </p>
            <p className="font-mono text-base leading-snug text-accent md:text-lg">
              {step === "operator"
                ? "Identificación del Operador requerida. ¿Cuál es tu nombre?"
                : "Asigna un identificador para tu Exocórtex (IA). Deja en blanco para permitir auto-asignación."}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex min-h-11 flex-1 items-center gap-2 border border-accent/30 px-3">
                <span className="font-mono text-accent">{">"}</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={busy}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={
                    step === "operator"
                      ? "nombre del operador"
                      : "vacío = auto (Mastropiero)"
                  }
                  className="w-full bg-transparent font-mono text-sm text-accent outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                disabled={busy || (step === "operator" && !input.trim())}
                onClick={() => {
                  if (step === "operator") void submitOperator();
                  else void submitExocortex();
                }}
                className={cn(
                  "min-h-11 border border-accent bg-accent/15 px-4 font-mono text-[11px] tracking-[0.18em] text-accent uppercase",
                  "hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40",
                )}
              >
                {busy ? "[ PROCESANDO… ]" : "[ CONFIRMAR ]"}
              </button>
            </div>
            {error ? (
              <p className="font-mono text-[11px] text-destructive">{error}</p>
            ) : null}
          </div>
        ) : null}

        {step === "decoding" && decodedName ? (
          <NameDecodeAnimation
            active
            finalName={decodedName}
            onComplete={() => {
              if (pendingYo) onComplete(pendingYo);
            }}
          />
        ) : null}

        {step === "decoding" && !decodedName ? (
          <div className="border border-accent/35 bg-black/40 p-4 font-mono">
            <p className="text-[10px] tracking-[0.28em] text-accent uppercase">
              [ CONSULTANDO NÚCLEO · AUTO-ASIGNACIÓN… ]
            </p>
            <p className="mt-3 animate-pulse text-lg tracking-[0.2em] text-accent">
              ▓▒░█▒▓░▒█▓▒░
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
