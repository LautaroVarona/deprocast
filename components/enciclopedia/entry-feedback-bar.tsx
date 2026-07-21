"use client";

import { CorpusLinkSheet } from "@/components/enciclopedia/corpus-link-sheet";
import { useEnciclopedia } from "@/components/enciclopedia/enciclopedia-context";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetFooter,
  SheetHeader,
} from "@/components/ui/sheet";
import type { EncyclopediaReportType } from "@/lib/enciclopedia/types";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  FlagIcon,
  LinkIcon,
  Loader2Icon,
  ThumbsUpIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const REPORT_TYPES: {
  value: EncyclopediaReportType;
  label: string;
}[] = [
  { value: "inaccuracy", label: "Información incorrecta" },
  { value: "missing", label: "Falta contexto importante" },
  { value: "other", label: "Otro problema" },
];

export function EntryFeedbackBar() {
  const { currentEntry, submitReport, isBusy } = useEnciclopedia();
  const [corpusOpen, setCorpusOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] =
    useState<EncyclopediaReportType>("inaccuracy");
  const [comment, setComment] = useState("");
  const [validatedLocally, setValidatedLocally] = useState(false);

  useEffect(() => {
    setValidatedLocally(false);
  }, [currentEntry?.id]);

  if (!currentEntry) return null;

  async function handleValidate() {
    try {
      await submitReport("validate");
      setValidatedLocally(true);
      toast.success("Gracias por validar esta entrada.");
    } catch {
      toast.error("No se pudo registrar la validación.");
    }
  }

  async function handleReport() {
    try {
      await submitReport(reportType, comment.trim() || undefined);
      setReportOpen(false);
      setComment("");
      toast.success("Reporte enviado. Ayuda a mejorar futuras respuestas.");
    } catch {
      toast.error("No se pudo enviar el reporte.");
    }
  }

  return (
    <>
      <section className="enciclopedia-noir-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="space-y-0.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent/60">
            05 · Vincula · 06 · Reporta
          </p>
          <p className="text-xs text-muted-foreground">
            {currentEntry.validatedCount} validaciones ·{" "}
            {currentEntry.reportCount} reportes
            {currentEntry.kgNodeId ? " · vinculada al Corpus" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy || validatedLocally}
            onClick={() => void handleValidate()}
            className={cn(
              "border-border bg-transparent font-mono text-[10px] uppercase tracking-wider",
              validatedLocally
                ? "text-primary"
                : "text-muted-foreground hover:border-primary/30 hover:text-primary",
            )}
          >
            {validatedLocally ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <ThumbsUpIcon className="size-3.5" />
            )}
            Validar
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => setReportOpen(true)}
            className="border-border bg-transparent font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:border-destructive/30 hover:text-destructive"
          >
            <FlagIcon className="size-3.5" />
            Reportar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isBusy}
            onClick={() => setCorpusOpen(true)}
            className="bg-accent/15 font-mono text-[10px] uppercase tracking-wider text-accent hover:bg-accent/90/25"
          >
            <LinkIcon className="size-3.5" />
            Vincular al Corpus
          </Button>
        </div>
      </section>

      <CorpusLinkSheet open={corpusOpen} onOpenChange={setCorpusOpen} />

      <Sheet open={reportOpen} onOpenChange={setReportOpen}>
        <SheetHeader
          title="Reportar información"
          description="Describí qué está mal o qué falta. Esto queda registrado para mejorar el Enciclopediador."
          onClose={() => setReportOpen(false)}
        />
        <SheetBody className="space-y-4">
          <div className="space-y-2">
            <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Tipo de reporte
            </label>
            <div className="space-y-2">
              {REPORT_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                    reportType === type.value
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-border text-muted-foreground hover:border-border",
                  )}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={type.value}
                    checked={reportType === type.value}
                    onChange={() => setReportType(type.value)}
                    className="accent-amber-500"
                  />
                  {type.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Comentario (opcional)
            </label>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              placeholder="¿Qué debería corregirse o ampliarse?"
              className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-muted-foreground outline-none"
            />
          </div>
        </SheetBody>
        <SheetFooter>
          <Button
            type="button"
            disabled={isBusy}
            onClick={() => void handleReport()}
            className="bg-destructive/90 font-mono text-xs uppercase tracking-wider text-foreground hover:bg-destructive/20"
          >
            {isBusy ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <FlagIcon className="size-4" />
            )}
            Enviar reporte
          </Button>
        </SheetFooter>
      </Sheet>
    </>
  );
}
