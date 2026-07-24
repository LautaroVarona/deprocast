"use client";

import { completeNosceMissionAction } from "@/app/yo/actions";
import {
  NOSCE_BINARY_OPTIONS,
  NOSCE_PRIMA_MATERIA_CHIPS,
  ROMAN_FREE_TEXT_REGEX,
  ROMAN_WORD_MAX,
  type YoDto,
} from "@/lib/yo/types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type MissionNosceOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: (yo: YoDto) => void;
};

type Step = 1 | 2 | 3;

function sanitizeRomanFreeText(raw: string): string {
  const lettersOnly = raw.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
  const collapsed = lettersOnly.replace(/\s+/g, " ");
  return collapsed
    .split(" ")
    .map((word) => word.slice(0, ROMAN_WORD_MAX))
    .join(" ");
}

function isValidRomanFreeText(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!ROMAN_FREE_TEXT_REGEX.test(trimmed)) return false;
  return trimmed.split(/\s+/).every((word) => word.length <= ROMAN_WORD_MAX);
}

export function MissionNosceOverlay({
  open,
  onOpenChange,
  onCompleted,
}: MissionNosceOverlayProps) {
  const [step, setStep] = useState<Step>(1);
  const [binary, setBinary] = useState<(typeof NOSCE_BINARY_OPTIONS)[number] | null>(
    null,
  );
  const [chips, setChips] = useState<
    Array<(typeof NOSCE_PRIMA_MATERIA_CHIPS)[number]>
  >([]);
  const [freeText, setFreeText] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setBinary(null);
    setChips([]);
    setFreeText("");
    setSaving(false);
    setSuccess(false);
  }, [open]);

  const toggleChip = (chip: (typeof NOSCE_PRIMA_MATERIA_CHIPS)[number]) => {
    setChips((prev) =>
      prev.includes(chip) ? prev.filter((item) => item !== chip) : [...prev, chip],
    );
  };

  const handleBinary = (value: (typeof NOSCE_BINARY_OPTIONS)[number]) => {
    setBinary(value);
    window.setTimeout(() => setStep(2), 220);
  };

  const handleConfirmChips = () => {
    if (chips.length === 0) {
      toast.error("Seleccioná al menos un tipo de Prima Materia.");
      return;
    }
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!binary || chips.length === 0 || !isValidRomanFreeText(freeText) || saving) {
      return;
    }

    setSaving(true);
    try {
      const result = await completeNosceMissionAction({
        exoesqueleto: binary,
        primaMateria: chips,
        esperanza: freeText.trim(),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setSuccess(true);
      window.setTimeout(() => {
        onCompleted(result.data);
        onOpenChange(false);
      }, 900);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <button
            type="button"
            aria-label="Cerrar modal"
            className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
            onClick={() => !saving && onOpenChange(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nosce-modal-title"
            className="mission-modal relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-2xl flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            <header className="flex items-start justify-between gap-3 border-b border-legion-bronze/30 px-5 py-4 md:px-6">
              <div>
                <p className="font-mono text-[10px] tracking-[0.32em] text-legion-bronze uppercase">
                  Misión I · Paso {step}/3
                </p>
                <h2
                  id="nosce-modal-title"
                  className="mt-1 font-display text-xl tracking-[0.06em] text-legion-bone md:text-2xl"
                >
                  Nosce Te Ipsum
                </h2>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => onOpenChange(false)}
                className="rounded-sm border border-legion-bronze/35 p-1.5 text-legion-bronze/80 transition hover:border-legion-bronze hover:text-legion-bone"
              >
                <XIcon className="size-4" />
              </button>
            </header>

            <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6 md:py-6">
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    key="success"
                    className="flex min-h-[14rem] flex-col items-center justify-center gap-3 text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="flex size-14 items-center justify-center rounded-full border border-legion-gold/60 bg-legion-gold/15 text-legion-gold shadow-[0_0_28px_-6px_rgba(201,166,107,0.55)]">
                      <CheckIcon className="size-7" />
                    </span>
                    <p className="font-display text-lg tracking-[0.08em] text-legion-gold">
                      Sello dorado aplicado
                    </p>
                    <p className="font-mono text-[11px] tracking-[0.18em] text-legion-bone/60 uppercase">
                      El Senado se desbloquea
                    </p>
                  </motion.div>
                ) : step === 1 ? (
                  <motion.div
                    key="step-1"
                    className="space-y-6"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.22 }}
                  >
                    <p className="font-display text-lg leading-snug text-legion-bone md:text-xl">
                      ¿Has operado un Exoesqueleto Cognitivo antes?
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {NOSCE_BINARY_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleBinary(option)}
                          className={cn(
                            "genesis-btn min-h-14 px-3 font-display text-sm tracking-[0.12em] uppercase",
                            binary === option && "ring-2 ring-legion-gold/70",
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : step === 2 ? (
                  <motion.div
                    key="step-2"
                    className="space-y-6"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.22 }}
                  >
                    <p className="font-display text-lg leading-snug text-legion-bone md:text-xl">
                      ¿Qué tipo de Prima Materia (Input) planeas cargar con mayor
                      frecuencia?
                    </p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {NOSCE_PRIMA_MATERIA_CHIPS.map((chip) => {
                        const selected = chips.includes(chip);
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => toggleChip(chip)}
                            className={cn(
                              "mission-chip rounded-full border px-3 py-2.5 text-left font-mono text-[11px] tracking-[0.04em] transition",
                              selected
                                ? "border-legion-gold/70 bg-legion-gold/15 text-legion-gold shadow-[inset_0_0_0_1px_rgba(201,166,107,0.25)]"
                                : "border-legion-bronze/40 bg-black/35 text-legion-bone/75 hover:border-legion-bronze hover:text-legion-bone",
                            )}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={handleConfirmChips}
                      disabled={chips.length === 0}
                      className="genesis-btn flex min-h-11 w-full items-center justify-center px-4 font-display text-sm tracking-[0.14em] uppercase disabled:opacity-40"
                    >
                      Confirmar Selección
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step-3"
                    className="space-y-5"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.22 }}
                  >
                    <p className="font-display text-lg leading-snug text-legion-bone md:text-xl">
                      ¿Qué esperas de Deprocast?
                    </p>
                    <label className="block space-y-2">
                      <textarea
                        value={freeText}
                        onChange={(event) =>
                          setFreeText(sanitizeRomanFreeText(event.target.value))
                        }
                        rows={5}
                        placeholder="Sólo letras. Máximo 13 caracteres por palabra."
                        className="mission-roman-textarea w-full resize-none px-3 py-3 font-mono text-sm text-legion-bone outline-none placeholder:text-legion-bone/35"
                        autoFocus
                      />
                      <span className="block font-mono text-[10px] tracking-[0.14em] text-legion-bronze/75 uppercase">
                        Reglas romanas · letras · máx. {ROMAN_WORD_MAX} / palabra
                      </span>
                    </label>
                    <button
                      type="button"
                      disabled={saving || !isValidRomanFreeText(freeText)}
                      onClick={() => void handleSubmit()}
                      className="genesis-btn flex min-h-11 w-full items-center justify-center gap-2 px-4 font-display text-sm tracking-[0.14em] uppercase disabled:opacity-40"
                    >
                      {saving ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : null}
                      Sellar ADN
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
