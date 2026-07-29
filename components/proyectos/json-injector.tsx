"use client";

import { useBabel } from "@/components/babel/babel-context";
import { importProjectFromJson } from "@/lib/proyectos/actions";
import { PROJECT_JSON_TEMPLATE } from "@/lib/proyectos/json-codex";
import { cacheProjectEntity } from "@/lib/personas/client-cache";
import { cn } from "@/lib/utils";
import { notifyDomainRefresh } from "@/lib/domain-refresh";
import { AnimatePresence, motion } from "framer-motion";
import {
  BracesIcon,
  CheckIcon,
  ClipboardCopyIcon,
  Loader2Icon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type JsonInjectorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
};

type TabId = "import" | "export";

const TEMPLATE_JSON = JSON.stringify(PROJECT_JSON_TEMPLATE, null, 2);

export function JsonInjector({ open, onOpenChange, onImported }: JsonInjectorProps) {
  const { universeSlug } = useBabel();
  const [tab, setTab] = useState<TabId>("import");
  const [payload, setPayload] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setPayload("");
      setTab("import");
      setCopied(false);
    }
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(TEMPLATE_JSON);
      setCopied(true);
      toast.success("Plantilla copiada al portapapeles");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("No se pudo copiar la plantilla");
    }
  };

  const handleMaterialize = () => {
    const trimmed = payload.trim();
    if (!trimmed) {
      toast.error("Pegá un JSON válido antes de materializar");
      return;
    }

    startTransition(async () => {
      const result = await importProjectFromJson(trimmed, { universeSlug });
      if (!result.ok) {
        toast.error("Fallo de inyección", { description: result.error });
        return;
      }
      toast.success("Proyecto materializado", {
        description: result.project.title,
      });
      cacheProjectEntity(result.project);
      notifyDomainRefresh("all", "json-codex-import");
      onOpenChange(false);
      onImported?.();
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            type="button"
            aria-label="Cerrar panel"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => onOpenChange(false)}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="I/O Códice JSON"
            className="relative flex h-full w-full max-w-xl flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3">
              <div className="min-w-0 space-y-0.5">
                <p className="font-mono text-[10px] tracking-[0.22em] text-amber-500/80 uppercase">
                  Fricción Cero · I/O
                </p>
                <h2 className="flex items-center gap-2 font-mono text-sm font-semibold text-zinc-100">
                  <BracesIcon className="size-4 text-amber-500" aria-hidden />
                  Códice JSON
                </h2>
                <p className="font-mono text-[10px] text-zinc-500">
                  Importá un payload de IA o exportá la plantilla canónica.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm border border-zinc-800 text-zinc-500 transition-colors hover:border-zinc-700 hover:text-zinc-200"
              >
                <XIcon className="size-4" />
              </button>
            </header>

            <div className="flex shrink-0 gap-1 border-b border-zinc-800 px-4 pt-3">
              {(
                [
                  { id: "import", label: "Importar" },
                  { id: "export", label: "Exportar Plantilla" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "border-b-2 px-3 pb-2.5 font-mono text-[10px] tracking-[0.16em] uppercase transition-colors",
                    tab === item.id
                      ? "border-amber-500 text-amber-400"
                      : "border-transparent text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <AnimatePresence mode="wait">
                {tab === "import" ? (
                  <motion.div
                    key="import"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="flex h-full flex-col gap-3"
                  >
                    <p className="font-mono text-[10px] leading-relaxed text-zinc-500">
                      Pegá el JSON generado por una IA externa. Escala hermética{" "}
                      <span className="text-amber-500">1–12</span> en{" "}
                      <span className="text-zinc-400">priority / impact / friction</span>.
                    </p>
                    <textarea
                      value={payload}
                      onChange={(event) => setPayload(event.target.value)}
                      spellCheck={false}
                      placeholder='{\n  "title": "…",\n  "gravityMetrics": { "priority": 8, "impact": 7, "friction": 4 }\n}'
                      className={cn(
                        "min-h-[320px] flex-1 resize-none rounded-sm border border-zinc-800 bg-black/40 px-3 py-3",
                        "font-mono text-[11px] leading-relaxed text-amber-100/90 placeholder:text-zinc-700",
                        "outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20",
                      )}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="export"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[10px] text-zinc-500">
                        Estructura base del Códice · status nativo o ACTIVE/PAUSED/COMPLETED
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleCopy()}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-800 px-2 py-1 font-mono text-[10px] text-zinc-400 transition-colors hover:border-amber-500/40 hover:text-amber-400"
                      >
                        {copied ? (
                          <CheckIcon className="size-3 text-amber-500" />
                        ) : (
                          <ClipboardCopyIcon className="size-3" />
                        )}
                        {copied ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                    <pre
                      className={cn(
                        "overflow-x-auto rounded-sm border border-zinc-800 bg-black/50 p-3",
                        "font-mono text-[11px] leading-relaxed text-amber-100/80",
                      )}
                    >
                      {TEMPLATE_JSON}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {tab === "import" && (
              <footer className="shrink-0 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleMaterialize}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-sm border border-amber-500/40",
                    "bg-amber-500/15 px-4 py-2.5 font-mono text-[11px] tracking-[0.14em] text-amber-400 uppercase",
                    "transition-colors hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {isPending ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <SparklesIcon className="size-3.5" />
                  )}
                  {isPending ? "Materializando…" : "Materializar Proyecto"}
                </button>
              </footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
