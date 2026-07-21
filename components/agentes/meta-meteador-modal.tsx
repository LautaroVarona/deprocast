"use client";

import { Button } from "@/components/ui/button";
import {
  META_AREAS,
  type MetaMeteadorSessionItem,
  type MetaMeteadorStreamEvent,
} from "@/lib/meta-meteador/types";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Loader2Icon,
  PencilIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

type SessionRow = MetaMeteadorSessionItem & {
  editedTitle: string;
  isEditing: boolean;
  expandedMeta: boolean;
  expandedProcess: boolean;
  accepting: boolean;
  accepted: boolean;
  error?: string;
};

type MetaMeteadorModalProps = {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
};

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatStreamError(error: string): string {
  if (error.includes("Unknown argument `titleApplied`")) {
    return "Base de datos desactualizada. Ejecutá npm run db:meta y reiniciá el servidor.";
  }
  const firstLine = error.split("\n")[0]?.trim() ?? error;
  return firstLine.length > 220 ? `${firstLine.slice(0, 220)}…` : firstLine;
}

function metadataRows(item: MetaMeteadorSessionItem) {
  return [
    ["Materia", item.metadata.materia],
    ["Partícula", item.metadata.particula],
    ["Campo", item.metadata.campo],
    ["Onda", item.metadata.onda],
    ["Tiempo-Espacio", item.metadata.tiempo_espacio],
    ["Posición", item.metadata.posicion],
  ] as const;
}

function sessionRowKey(item: Pick<MetaMeteadorSessionItem, "documentId" | "oldFilename">) {
  return `${item.documentId}::${item.oldFilename}`;
}

function upsertSessionRow(
  current: SessionRow[],
  item: MetaMeteadorSessionItem,
): SessionRow[] {
  const key = sessionRowKey(item);
  const newRow: SessionRow = {
    ...item,
    editedTitle: item.proposedTitle,
    isEditing: false,
    expandedMeta: false,
    expandedProcess: false,
    accepting: false,
    accepted: item.titleApplied,
  };

  const index = current.findIndex((row) => sessionRowKey(row) === key);
  if (index === -1) return [...current, newRow];

  const existing = current[index];
  return current.map((row, rowIndex) =>
    rowIndex === index
      ? {
          ...newRow,
          editedTitle: existing.isEditing ? existing.editedTitle : newRow.editedTitle,
          isEditing: existing.isEditing,
          expandedMeta: existing.expandedMeta,
          expandedProcess: existing.expandedProcess,
          accepting: existing.accepting,
          accepted: existing.accepted || newRow.accepted,
        }
      : row,
  );
}

export function MetaMeteadorModal({
  open,
  onClose,
  onComplete,
}: MetaMeteadorModalProps) {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [streamErrors, setStreamErrors] = useState<
    Array<{ documentId: string; oldFilename: string; error: string }>
  >([]);
  const [running, setRunning] = useState(false);
  const [processing, setProcessing] = useState<{
    documentId: string;
    oldFilename: string;
    oldTitle: string;
  } | null>(null);
  const [startInfo, setStartInfo] = useState<{
    pending: number;
    skipped: number;
    total: number;
  } | null>(null);
  const [acceptingAll, setAcceptingAll] = useState(false);

  const reset = useCallback(() => {
    setRows([]);
    setStreamErrors([]);
    setProcessing(null);
    setStartInfo(null);
    setAcceptingAll(false);
  }, []);

  const startStream = useCallback(async (signal?: AbortSignal) => {
    reset();
    setRunning(true);

    try {
      const response = await fetch("/api/agentes/meta-meteador?stream=true", {
        method: "POST",
        signal,
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "No se pudo iniciar Meta-Meteador.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        if (signal?.aborted) break;

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as MetaMeteadorStreamEvent;

          if (event.type === "start") {
            setStartInfo({
              pending: event.pending,
              skipped: event.skipped,
              total: event.total,
            });
          } else if (event.type === "processing") {
            setProcessing({
              documentId: event.documentId,
              oldFilename: event.oldFilename,
              oldTitle: event.oldTitle,
            });
          } else if (event.type === "result") {
            setProcessing(null);
            setRows((current) => upsertSessionRow(current, event.item));
          } else if (event.type === "error" && event.documentId) {
            setProcessing(null);
            setStreamErrors((current) => {
              const key = sessionRowKey(event);
              if (current.some((entry) => sessionRowKey(entry) === key)) {
                return current;
              }
              return [
                ...current,
                {
                  documentId: event.documentId,
                  oldFilename: event.oldFilename,
                  error: formatStreamError(event.error),
                },
              ];
            });
          } else if (event.type === "done") {
            if (event.summary.errores.length > 0) {
              toast.message("Meta-Meteador finalizado con errores", {
                description: `${event.summary.procesados} procesados · ${event.summary.errores.length} errores`,
              });
            } else if (event.summary.procesados > 0) {
              toast.success("Meta-Meteador completado", {
                description: `${event.summary.procesados} documentos indexados`,
              });
            } else {
              toast.message("Sin documentos pendientes", {
                description: "Todos los archivos ya tienen ID Meta-Meteador.",
              });
            }
            onComplete();
          }
        }
      }
    } catch (error) {
      if (signal?.aborted) return;
      toast.error(
        error instanceof Error ? error.message : "Error al ejecutar Meta-Meteador",
      );
    } finally {
      if (signal?.aborted) return;
      setRunning(false);
      setProcessing(null);
    }
  }, [onComplete, reset]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    void startStream(controller.signal);

    return () => {
      controller.abort();
    };
    // Solo al abrir la modal; startStream gestiona su propio estado interno.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pendingAcceptRows = useMemo(
    () => rows.filter((row) => row.canRename && !row.accepted),
    [rows],
  );

  const acceptRows = async (targets: SessionRow[]) => {
    if (targets.length === 0) return;

    const ids = new Set(targets.map((row) => row.documentId));
    setRows((current) =>
      current.map((row) =>
        ids.has(row.documentId) ? { ...row, accepting: true } : row,
      ),
    );

    try {
      const response = await fetch("/api/agentes/meta-meteador", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: targets.map((row) => ({
            documentId: row.documentId,
            title: row.editedTitle.trim(),
          })),
        }),
      });

      const data = (await response.json()) as {
        applied?: number;
        errors?: Array<{ documentId: string; error: string }>;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron aplicar los títulos.");
      }

      const errorMap = new Map(
        (data.errors ?? []).map((entry) => [entry.documentId, entry.error]),
      );

      setRows((current) =>
        current.map((row) => {
          if (!ids.has(row.documentId)) return row;
          const error = errorMap.get(row.documentId);
          return {
            ...row,
            accepting: false,
            accepted: !error,
            proposedTitle: row.editedTitle.trim(),
            error,
          };
        }),
      );

      if ((data.applied ?? 0) > 0) {
        toast.success(
          `${data.applied} título${data.applied === 1 ? "" : "s"} aplicado${data.applied === 1 ? "" : "s"}`,
        );
      }

      if (data.errors?.length) {
        toast.error(`${data.errors.length} error(es) al aplicar títulos`);
      }
    } catch (error) {
      setRows((current) =>
        current.map((row) =>
          ids.has(row.documentId) ? { ...row, accepting: false } : row,
        ),
      );
      toast.error(
        error instanceof Error ? error.message : "Error al aplicar títulos",
      );
    }
  };

  const handleAcceptAll = async () => {
    setAcceptingAll(true);
    try {
      await acceptRows(pendingAcceptRows);
    } finally {
      setAcceptingAll(false);
    }
  };

  const handleClose = () => {
    if (running && !window.confirm("¿Cerrar mientras Meta-Meteador sigue ejecutándose?")) {
      return;
    }
    onClose();
  };

  if (!open || typeof document === "undefined") return null;

  const processedCount = rows.length + streamErrors.length;
  const totalToProcess = startInfo?.pending ?? 0;
  const progressPct =
    totalToProcess > 0
      ? Math.min(100, Math.round((processedCount / totalToProcess) * 100))
      : running
        ? 8
        : 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sesión Meta-Meteador"
    >
      <button
        type="button"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Cerrar"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-primary/30 bg-background shadow-2xl shadow-foreground/20">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary/80">
              Meta-Meteador
            </p>
            <h2 className="text-lg font-semibold text-foreground">
              Indexación en vivo
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Solo archivos sin ID Meta-Meteador
              {startInfo
                ? ` · ${startInfo.pending} pendientes · ${startInfo.skipped} omitidos`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={
                running || acceptingAll || pendingAcceptRows.length === 0
              }
              onClick={() => void handleAcceptAll()}
              className="gap-2"
            >
              {acceptingAll ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CheckIcon className="size-4" />
              )}
              Aceptar todo ({pendingAcceptRows.length})
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={handleClose}
              aria-label="Cerrar"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </header>

        <div className="border-b border-border px-5 py-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {running
                ? processing
                  ? `Procesando ${processing.oldFilename}…`
                  : "Preparando…"
                : "Completado"}
            </span>
            <span>
              {processedCount}/{totalToProcess || "—"}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/20 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {rows.length === 0 && streamErrors.length === 0 && !running ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hay documentos pendientes de indexación.
            </p>
          ) : null}

          <div className="space-y-2">
            {rows.map((row) => (
              <article
                key={sessionRowKey(row)}
                className="rounded-xl border border-border bg-muted/40"
              >
                <div className="flex flex-wrap items-start gap-3 p-3">
                  <button
                    type="button"
                    className="mt-1 text-muted-foreground hover:text-foreground/80"
                    onClick={() =>
                      setRows((current) =>
                        current.map((entry) =>
                          entry.documentId === row.documentId
                            ? { ...entry, expandedMeta: !entry.expandedMeta }
                            : entry,
                        ),
                      )
                    }
                    aria-label={
                      row.expandedMeta ? "Contraer metadatos" : "Expandir metadatos"
                    }
                  >
                    {row.expandedMeta ? (
                      <ChevronDownIcon className="size-4" />
                    ) : (
                      <ChevronRightIcon className="size-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    className="min-w-0 flex-1 space-y-1 text-left"
                    onClick={() =>
                      setRows((current) =>
                        current.map((entry) =>
                          entry.documentId === row.documentId
                            ? { ...entry, expandedMeta: !entry.expandedMeta }
                            : entry,
                        ),
                      )
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                        {shortId(row.documentId)}
                      </code>
                      {row.tituloLocked ? (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          título manual
                        </span>
                      ) : null}
                      {row.accepted ? (
                        <span className="text-[10px] uppercase tracking-wider text-primary">
                          título aplicado
                        </span>
                      ) : null}
                    </div>

                    <div className="grid gap-2 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                      <p className="truncate text-muted-foreground" title={row.oldFilename}>
                        {row.oldFilename}
                      </p>
                      <span className="hidden text-muted-foreground sm:inline">→</span>
                      {row.isEditing ? (
                        <input
                          value={row.editedTitle}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            setRows((current) =>
                              current.map((entry) =>
                                entry.documentId === row.documentId
                                  ? { ...entry, editedTitle: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          className="w-full rounded-md border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary/40"
                        />
                      ) : (
                        <p
                          className={cn(
                            "truncate font-medium",
                            row.canRename && !row.accepted
                              ? "text-primary"
                              : "text-foreground",
                          )}
                          title={row.editedTitle}
                        >
                          {row.editedTitle}
                        </p>
                      )}
                    </div>

                    {row.error ? (
                      <p className="text-xs text-destructive">{row.error}</p>
                    ) : null}
                  </button>

                  <div className="flex items-center gap-1">
                    {row.canRename && !row.accepted ? (
                      <>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            setRows((current) =>
                              current.map((entry) =>
                                entry.documentId === row.documentId
                                  ? { ...entry, isEditing: !entry.isEditing }
                                  : entry,
                              ),
                            );
                          }}
                          aria-label="Editar título"
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={row.accepting}
                          onClick={(event) => {
                            event.stopPropagation();
                            void acceptRows([row]);
                          }}
                          className="gap-1"
                        >
                          {row.accepting ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : (
                            <CheckIcon className="size-4" />
                          )}
                          Aplicar
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                {row.expandedMeta ? (
                  <div className="border-t border-border px-4 py-3">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Matriz cuántica
                    </p>
                    <dl className="grid gap-2 sm:grid-cols-2">
                      {metadataRows(row).map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-lg border border-border bg-background/60 px-3 py-2"
                        >
                          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {label}
                          </dt>
                          <dd className="mt-1 text-sm text-foreground">{value}</dd>
                        </div>
                      ))}
                    </dl>

                    <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Relevancia por área
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {META_AREAS.map((area) => (
                        <div
                          key={area}
                          className="rounded-lg border border-border bg-background/60 px-3 py-2"
                        >
                          <p className="text-xs text-muted-foreground">{area}</p>
                          <p className="text-sm font-medium text-foreground">
                            {row.areas[area].score_1_12}/12
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({row.areas[area].porcentaje}%)
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="mt-4 flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted/40"
                      onClick={() =>
                        setRows((current) =>
                          current.map((entry) =>
                            entry.documentId === row.documentId
                              ? {
                                  ...entry,
                                  expandedProcess: !entry.expandedProcess,
                                }
                              : entry,
                          ),
                        )
                      }
                    >
                      {row.expandedProcess ? (
                        <ChevronDownIcon className="size-4 shrink-0" />
                      ) : (
                        <ChevronRightIcon className="size-4 shrink-0" />
                      )}
                      Ver proceso de asignación
                    </button>

                    {row.expandedProcess ? (
                      <div className="mt-3 space-y-3 rounded-lg border border-border bg-background/80 p-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Modelo
                          </p>
                          <p className="mt-1 text-xs text-foreground/80">
                            {row.processTrace.modelUsed}
                            {row.processTrace.tituloEsManual
                              ? " · título conservado (manual)"
                              : " · título generado por IA"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Prompt enviado
                          </p>
                          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-card/80 p-3 text-[11px] leading-relaxed text-muted-foreground">
                            {row.processTrace.userPrompt}
                          </pre>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Respuesta cruda de la IA
                          </p>
                          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-card/80 p-3 text-[11px] leading-relaxed text-muted-foreground">
                            {row.processTrace.rawResponse}
                          </pre>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}

            {streamErrors.map((entry) => (
              <article
                key={`error-${sessionRowKey(entry)}`}
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-3"
              >
                <div className="flex items-center gap-2">
                  <code className="rounded bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
                    {shortId(entry.documentId)}
                  </code>
                  <span className="truncate text-sm text-muted-foreground">
                    {entry.oldFilename}
                  </span>
                </div>
                <p className="mt-2 text-xs text-destructive">{entry.error}</p>
              </article>
            ))}

            {processing ? (
              <article className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2Icon className="size-4 animate-spin" />
                  <code className="text-[11px] text-primary">
                    {shortId(processing.documentId)}
                  </code>
                  <span className="truncate">{processing.oldFilename}</span>
                </div>
              </article>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
