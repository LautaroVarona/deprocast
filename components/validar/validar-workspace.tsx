"use client";

import { Button } from "@/components/ui/button";
import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
} from "@/lib/document-constants";
import type { CampoInfo } from "@/lib/projects/campos";
import type { PurifierReviewRecord } from "@/lib/purifier/types";
import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  Loader2Icon,
  ShieldCheckIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function extractBodyFromMarkdown(markdown: string): string {
  const match = markdown.match(/##\s+Transcripción purificada\s*\n+([\s\S]*?)$/i);
  if (match?.[1]) return match[1].trim();

  const afterFrontmatter = markdown.replace(/^---\n[\s\S]*?\n---\n*/, "");
  const afterTitle = afterFrontmatter.replace(/^#\s+.+\n+/, "");
  return afterTitle.trim();
}

function highlightDudaLines(text: string): Array<{ line: string; isDuda: boolean }> {
  return text.split("\n").map((line) => ({
    line,
    isDuda: /==DUDA:/i.test(line) || /===DUDA:/i.test(line),
  }));
}

function DimensionInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-full rounded border border-input bg-background px-2 font-mono text-[10px] outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

function GravitySlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between">
        <span className="text-[9px] font-medium text-muted-foreground uppercase">
          {label}
        </span>
        <span className="font-mono text-[10px] tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={MIN_BASE_WEIGHT}
        max={MAX_BASE_WEIGHT}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full appearance-none rounded-full bg-muted accent-primary"
      />
    </div>
  );
}

export function ValidarWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [records, setRecords] = useState<
    Array<{ reviewId: string; title: string; processedAt: string }>
  >([]);
  const [record, setRecord] = useState<PurifierReviewRecord | null>(null);
  const [campos, setCampos] = useState<CampoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const [title, setTitle] = useState("");
  const [campoSlug, setCampoSlug] = useState("babel");
  const [body, setBody] = useState("");
  const [metaTags, setMetaTags] = useState("");
  const [dimensions, setDimensions] = useState({
    materia: "",
    particula: "",
    posicion: "",
    onda: "",
    tiempo: "",
    espacio: "",
    field: "",
    prioridad: 6,
    impacto: 6,
    dificultad: 6,
  });

  const loadQueue = useCallback(async () => {
    try {
      const response = await fetch("/api/purifier/review", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setRecords(data.records ?? []);
    } catch {
      // no crítico
    }
  }, []);

  const loadRecord = useCallback(async (reviewId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/purifier/review/${reviewId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setRecord(null);
        return;
      }

      const data = await response.json();
      const r = data.record as PurifierReviewRecord;
      setRecord(r);

      const d = r.suggestedDimensions;
      setTitle(d.title);
      setCampoSlug(r.gravity.campoSlug);
      setBody(extractBodyFromMarkdown(r.normalizedMarkdown));
      setMetaTags(r.metaTagsSecundarios.join(", "));
      setDimensions({
        materia: d.materia,
        particula: d.particula,
        posicion: d.posicion,
        onda: d.onda,
        tiempo: d.tiempo,
        espacio: d.espacio,
        field: d.field,
        prioridad: d.prioridad,
        impacto: d.impacto,
        dificultad: d.dificultad,
      });
    } catch {
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
    void (async () => {
      const response = await fetch("/api/proyectos", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setCampos(data.campos ?? []);
      }
    })();
  }, [loadQueue]);

  useEffect(() => {
    if (selectedId) {
      void loadRecord(selectedId);
    } else if (records.length > 0) {
      router.replace(`/validar?id=${records[0].reviewId}`);
    } else {
      setLoading(false);
    }
  }, [selectedId, records, loadRecord, router]);

  const dudaPreview = useMemo(() => highlightDudaLines(body), [body]);

  const handleApprove = async () => {
    if (!record) return;
    setApproving(true);

    try {
      const response = await fetch("/api/purifier/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: record.reviewId,
          campoSlug,
          title,
          markdownBody: body,
          metaTagsSecundarios: metaTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          dimensions,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo aprobar el documento");
      }

      toast.success("Conocimiento coagulado.", {
        description: data.relativePath,
      });

      await loadQueue();
      const remaining = records.filter((r) => r.reviewId !== record.reviewId);
      if (remaining.length > 0) {
        router.replace(`/validar?id=${remaining[0].reviewId}`);
      } else {
        setRecord(null);
        router.replace("/validar");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al aprobar",
      );
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="size-4 text-primary" />
          <div>
            <p className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
              Aduana Humana · HITL
            </p>
            <h1 className="text-sm font-semibold">Validar y Coagular</h1>
          </div>
        </div>

        {records.length > 0 && (
          <select
            value={selectedId ?? ""}
            onChange={(e) => router.push(`/validar?id=${e.target.value}`)}
            className="h-7 max-w-xs rounded border border-input bg-background px-2 font-mono text-[10px] outline-none"
          >
            {records.map((r) => (
              <option key={r.reviewId} value={r.reviewId}>
                {r.title}
              </option>
            ))}
          </select>
        )}
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !record ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="font-mono text-xs text-muted-foreground">
            Cola de revisión vacía. Enviá materia desde el canal de Audio.
          </p>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Columna izquierda — materia cruda */}
            <aside className="flex w-[40%] shrink-0 flex-col border-r border-border">
              <div className="shrink-0 border-b border-border px-3 py-1.5">
                <p className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
                  Materia Prima Cruda
                </p>
                <p className="truncate font-mono text-[10px] text-foreground/80">
                  {record.source.filename}
                </p>
              </div>
              <pre className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {record.originalText}
              </pre>
            </aside>

            {/* Columna derecha — formulario */}
            <div className="flex min-w-0 flex-[60] flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <DimensionInput
                    label="Título"
                    value={title}
                    onChange={setTitle}
                  />
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
                      Campo destino
                    </label>
                    <select
                      value={campoSlug}
                      onChange={(e) => setCampoSlug(e.target.value)}
                      className="h-7 w-full rounded border border-input bg-background px-2 font-mono text-[10px] outline-none"
                    >
                      {campos.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <DimensionInput
                    label="Materia"
                    value={dimensions.materia}
                    onChange={(v) => setDimensions((d) => ({ ...d, materia: v }))}
                  />
                  <DimensionInput
                    label="Partícula"
                    value={dimensions.particula}
                    onChange={(v) => setDimensions((d) => ({ ...d, particula: v }))}
                  />
                  <DimensionInput
                    label="Posición"
                    value={dimensions.posicion}
                    onChange={(v) => setDimensions((d) => ({ ...d, posicion: v }))}
                  />
                  <DimensionInput
                    label="Onda"
                    value={dimensions.onda}
                    onChange={(v) => setDimensions((d) => ({ ...d, onda: v }))}
                  />
                  <DimensionInput
                    label="Tiempo"
                    value={dimensions.tiempo}
                    onChange={(v) => setDimensions((d) => ({ ...d, tiempo: v }))}
                  />
                  <DimensionInput
                    label="Espacio"
                    value={dimensions.espacio}
                    onChange={(v) => setDimensions((d) => ({ ...d, espacio: v }))}
                  />
                  <DimensionInput
                    label="Field"
                    value={dimensions.field}
                    onChange={(v) => setDimensions((d) => ({ ...d, field: v }))}
                  />
                  <DimensionInput
                    label="Meta tags"
                    value={metaTags}
                    onChange={setMetaTags}
                  />
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2 rounded border border-border bg-muted/30 p-2">
                  <GravitySlider
                    label="Prioridad"
                    value={dimensions.prioridad}
                    onChange={(v) => setDimensions((d) => ({ ...d, prioridad: v }))}
                  />
                  <GravitySlider
                    label="Impacto"
                    value={dimensions.impacto}
                    onChange={(v) => setDimensions((d) => ({ ...d, impacto: v }))}
                  />
                  <GravitySlider
                    label="Dificultad"
                    value={dimensions.dificultad}
                    onChange={(v) => setDimensions((d) => ({ ...d, dificultad: v }))}
                  />
                </div>

                <div className="space-y-1">
                  <p className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
                    Cuerpo purificado
                  </p>
                  <div className="mb-2 max-h-24 overflow-y-auto rounded border border-border bg-muted/20 p-2">
                    {dudaPreview.map((item, index) => (
                      <div
                        key={index}
                        className={cn(
                          "font-mono text-[10px] leading-relaxed",
                          item.isDuda &&
                            "bg-yellow-300/90 px-1 text-yellow-950 dark:bg-yellow-400/90 dark:text-yellow-950",
                        )}
                      >
                        {item.line || "\u00a0"}
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="min-h-[120px] w-full resize-y rounded border border-input bg-background p-2 font-mono text-[10px] leading-relaxed outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          <footer className="flex shrink-0 items-center justify-between border-t border-border bg-card px-4 py-2">
            <p className="font-mono text-[9px] text-muted-foreground">
              {record.doubts.length > 0
                ? `${record.doubts.length} zona${record.doubts.length === 1 ? "" : "s"} de duda · revisar líneas amarillas`
                : "Sin zonas de duda detectadas"}
            </p>
            <Button
              type="button"
              size="default"
              disabled={approving}
              onClick={() => void handleApprove()}
              className="gap-2 font-medium"
            >
              {approving ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Coagulando…
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="size-4" />
                  Aprobar y Coagular Conocimiento
                </>
              )}
            </Button>
          </footer>
        </>
      )}
    </div>
  );
}
