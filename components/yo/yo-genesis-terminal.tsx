"use client";

import {
  baptizeExocortexAction,
  baptizeOperatorAction,
} from "@/app/yo/actions";
import type { YoDto } from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, User } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type GenesisStep = "operator" | "exocortex" | "decoding";
type Phase = "boot" | "form";

type YoGenesisTerminalProps = {
  yo: YoDto;
  onComplete: (yo: YoDto) => void;
};

const BOOT_TEXT = "Protocolo Génesis · Nodo Yo";
const BOOT_HOLD_MS = 1500;
const DECODE_MS = 2000;
const GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789·ÆØÞΩΨΣΞ";

function TypewriterBoot({
  text,
  onDone,
}: {
  text: string;
  onDone: () => void;
}) {
  const [shown, setShown] = useState("");
  const [fading, setFading] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let i = 0;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;

    const typeTimer = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(typeTimer);
        holdTimer = setTimeout(() => {
          setFading(true);
          fadeTimer = setTimeout(() => onDoneRef.current(), 700);
        }, BOOT_HOLD_MS);
      }
    }, 42);

    return () => {
      clearInterval(typeTimer);
      if (holdTimer) clearTimeout(holdTimer);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [text]);

  return (
    <motion.div
      className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4"
      initial={{ opacity: 1 }}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.65, ease: "easeInOut" }}
    >
      <p className="font-display text-center text-lg tracking-[0.18em] text-legion-bone md:text-2xl">
        {shown}
        <span className="genesis-type-cursor" aria-hidden>
          |
        </span>
      </p>
    </motion.div>
  );
}

function DecodeGlyphs({
  finalName,
  onComplete,
  onTick,
}: {
  finalName: string;
  onComplete: () => void;
  onTick?: (partial: string) => void;
}) {
  const [display, setDisplay] = useState("");
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);
  onCompleteRef.current = onComplete;
  onTickRef.current = onTick;

  useEffect(() => {
    doneRef.current = false;
    const started = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / DECODE_MS);
      const revealCount = Math.floor(progress * finalName.length);

      const next = Array.from({ length: finalName.length }, (_, index) => {
        if (index < revealCount) return finalName[index];
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }).join("");

      setDisplay(next);
      onTickRef.current?.(next);

      if (progress < 1) {
        raf = window.requestAnimationFrame(tick);
        return;
      }

      setDisplay(finalName);
      onTickRef.current?.(finalName);
      if (!doneRef.current) {
        doneRef.current = true;
        onCompleteRef.current();
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [finalName]);

  return (
    <div className="space-y-3 py-2 text-center">
      <p className="font-mono text-[10px] tracking-[0.28em] text-legion-bronze uppercase">
        Decodificación
      </p>
      <p
        className="font-display text-3xl tracking-[0.14em] text-legion-gold md:text-4xl"
        aria-live="polite"
      >
        {display || "········"}
      </p>
    </div>
  );
}

function StatusPlaque({
  index,
  label,
  value,
  icon,
  flash,
}: {
  index: string;
  label: string;
  value: string;
  icon: ReactNode;
  flash?: boolean;
}) {
  return (
    <motion.div
      layout
      className={cn(
        "genesis-plaque px-3.5 py-3",
        flash && "genesis-plaque--flash",
      )}
      animate={flash ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={{ duration: 0.55 }}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0 text-legion-bronze">{icon}</span>
        <p className="min-w-0 font-mono text-[11px] leading-relaxed tracking-wide text-legion-bone">
          <span className="text-legion-bronze">{index}</span> {label}:{" "}
          <span className="text-legion-bone/90">{value}</span>
        </p>
      </div>
    </motion.div>
  );
}

export function YoGenesisTerminal({ yo, onComplete }: YoGenesisTerminalProps) {
  const [phase, setPhase] = useState<Phase>("boot");
  const [step, setStep] = useState<GenesisStep>(() =>
    yo.operatorName?.trim() ? "exocortex" : "operator",
  );
  const [operatorName, setOperatorName] = useState(yo.operatorName ?? "");
  const [exocortexName, setExocortexName] = useState<string | null>(
    yo.exocortexName ?? null,
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decodedName, setDecodedName] = useState<string | null>(null);
  const [decodingPreview, setDecodingPreview] = useState<string | null>(null);
  const [pendingYo, setPendingYo] = useState<YoDto | null>(null);
  const [operatorFlash, setOperatorFlash] = useState(false);
  const [exocortexFlash, setExocortexFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bootDoneRef = useRef(false);

  const handleBootDone = () => {
    if (bootDoneRef.current) return;
    bootDoneRef.current = true;
    setPhase("form");
  };

  useEffect(() => {
    if (phase === "form" && step !== "decoding") {
      inputRef.current?.focus();
    }
  }, [phase, step]);

  const flashOperator = () => {
    setOperatorFlash(true);
    window.setTimeout(() => setOperatorFlash(false), 1200);
  };

  const flashExocortex = () => {
    setExocortexFlash(true);
    window.setTimeout(() => setExocortexFlash(false), 1200);
  };

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
    flashOperator();
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

    setExocortexName(result.data.resolvedName);
    flashExocortex();
    setBusy(false);
    onComplete(result.data.yo);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (step === "operator") void submitOperator();
    if (step === "exocortex") void submitExocortex();
  };

  const operatorLabel = operatorName.trim()
    ? operatorName.trim()
    : "— pendiente";
  const exocortexLabel = exocortexName?.trim()
    ? exocortexName.trim()
    : decodingPreview
      ? decodingPreview
      : "— pendiente";

  return (
    <div className="genesis-void-root overflow-x-hidden">
      <AnimatePresence mode="wait">
        {phase === "boot" ? (
          <motion.div
            key="boot"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <TypewriterBoot text={BOOT_TEXT} onDone={handleBootDone} />
          </motion.div>
        ) : (
          <motion.div
            key="form"
            className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.55 }}
          >
            <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-5 lg:flex-row lg:items-center lg:justify-center lg:gap-7">
              <motion.section
                className="genesis-scroll relative z-10 w-full max-w-md px-7 py-9 md:px-9 md:py-11"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <header className="relative z-10 space-y-5 text-center">
                  <h1 className="font-display text-3xl tracking-[0.08em] text-legion-bone md:text-4xl">
                    I - Bautismo
                  </h1>

                  <AnimatePresence mode="wait">
                    {step === "decoding" && decodedName ? (
                      <motion.div
                        key="decode"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.35 }}
                      >
                        <DecodeGlyphs
                          finalName={decodedName}
                          onTick={setDecodingPreview}
                          onComplete={() => {
                            setExocortexName(decodedName);
                            setDecodingPreview(null);
                            flashExocortex();
                            if (pendingYo) onComplete(pendingYo);
                          }}
                        />
                      </motion.div>
                    ) : step === "decoding" ? (
                      <motion.div
                        key="decode-wait"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3 py-2"
                      >
                        <p className="font-mono text-[10px] tracking-[0.28em] text-legion-bronze uppercase">
                          Consultando núcleo
                        </p>
                        <p className="font-display animate-pulse text-2xl tracking-[0.2em] text-legion-gold">
                          ▓▒░█▒▓░▒█▓▒░
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-5"
                      >
                        <p className="font-display text-base leading-relaxed text-legion-bone/90 md:text-lg">
                          {step === "operator"
                            ? "¿Cómo quieres ser llamado?"
                            : "Asigna un identificador para tu Exocórtex."}
                        </p>

                        <div className="genesis-input flex min-h-12 items-center px-4">
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
                                ? "Nombre"
                                : "Deja en blanco para auto-asignación"
                            }
                            className="w-full bg-transparent font-mono text-sm text-legion-bone outline-none placeholder:text-legion-patina disabled:opacity-50"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={
                            busy || (step === "operator" && !input.trim())
                          }
                          onClick={() => {
                            if (step === "operator") void submitOperator();
                            else void submitExocortex();
                          }}
                          className="genesis-btn mx-auto block min-h-11 w-full max-w-[14rem] px-5 font-display text-sm tracking-[0.16em] uppercase"
                        >
                          {busy ? "…" : "Confirmar"}
                        </button>

                        {error ? (
                          <p className="font-mono text-[11px] text-destructive">
                            {error}
                          </p>
                        ) : null}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </header>
              </motion.section>

              <motion.aside
                className="flex w-full max-w-md flex-col gap-3 lg:w-56 lg:shrink-0"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.45 }}
              >
                <StatusPlaque
                  index="01"
                  label="Operador"
                  value={operatorLabel}
                  flash={operatorFlash}
                  icon={<User className="size-3.5" strokeWidth={1.75} />}
                />
                <StatusPlaque
                  index="02"
                  label="Exocórtex"
                  value={exocortexLabel}
                  flash={exocortexFlash}
                  icon={<Brain className="size-3.5" strokeWidth={1.75} />}
                />
              </motion.aside>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
