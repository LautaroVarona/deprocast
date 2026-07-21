"use client";

import { QuantaOverlay } from "@/components/cuadernos/quanta-overlay";
import { Switch } from "@/components/cuadernos/switch";
import { Button } from "@/components/ui/button";
import type {
  NotebookDetail,
  NotebookPageDto,
  PageAnalysis,
  PageNerEntities,
} from "@/lib/cuadernos/types";
import { fetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  Loader2Icon,
  SaveIcon,
  ScanEyeIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type NotebookViewerProps = {
  notebookId: string;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Sin procesar",
  PROCESSING: "Procesando…",
  COMPLETED: "Vectorizada",
  ERROR: "Error",
};

const NER_KEYS: Array<keyof PageNerEntities> = [
  "persona",
  "org",
  "proyecto",
  "lugar",
  "concepto",
];

const NER_LABEL: Record<keyof PageNerEntities, string> = {
  persona: "Persona",
  org: "Org",
  proyecto: "Proyecto",
  lugar: "Lugar",
  concepto: "Concepto",
};

function emptyAnalysis(pageNumber: number): PageAnalysis {
  return {
    suggestedTitle: "",
    explanation: "",
    writtenContentDescription: "",
    semanticTags: [],
    ner: { persona: [], org: [], proyecto: [], lugar: [], concepto: [] },
    pageNumber,
  };
}

function analysisFromPage(page: NotebookPageDto): PageAnalysis {
  if (page.pageAnalysis) return page.pageAnalysis;
  return {
    ...emptyAnalysis(page.pageNumber),
    suggestedTitle: "",
    writtenContentDescription: page.semanticVector?.slice(0, 400) ?? "",
    semanticTags: page.structuralVector?.tags ?? page.pageMetatags.map((t) => t.label),
  };
}

export function NotebookViewer({ notebookId }: NotebookViewerProps) {
  const [notebook, setNotebook] = useState<NotebookDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showQuanta, setShowQuanta] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<PageAnalysis>(emptyAnalysis(1));
  const [tagDraft, setTagDraft] = useState("");
  const [nerDraft, setNerDraft] = useState<Record<keyof PageNerEntities, string>>({
    persona: "",
    org: "",
    proyecto: "",
    lugar: "",
    concepto: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadNotebook = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchJson<{ notebook: NotebookDetail }>(
        `/api/cuadernos/${notebookId}`,
        { cache: "no-store" },
      );
      setNotebook(data.notebook);
      setActiveIndex((prev) =>
        data.notebook.pages.length === 0
          ? 0
          : Math.min(prev, data.notebook.pages.length - 1),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo cargar el cuaderno.",
      );
      setNotebook(null);
    } finally {
      setIsLoading(false);
    }
  }, [notebookId]);

  useEffect(() => {
    void loadNotebook();
  }, [loadNotebook]);

  const activePage: NotebookPageDto | null =
    notebook?.pages[activeIndex] ?? null;

  useEffect(() => {
    if (activePage) {
      setForm(analysisFromPage(activePage));
    }
  }, [activePage?.id, activePage?.pageAnalysis, activePage?.status]);

  const handleProcess = async () => {
    if (!activePage) return;

    setIsProcessing(true);
    try {
      const data = await fetchJson<{ page: NotebookPageDto }>(
        `/api/cuadernos/pages/${activePage.id}/process`,
        { method: "POST" },
      );
      setNotebook((prev) => {
        if (!prev) return prev;
        const pages = prev.pages.map((p) =>
          p.id === data.page.id ? data.page : p,
        );
        return {
          ...prev,
          pages,
          processedCount: pages.filter((p) => p.status === "COMPLETED").length,
        };
      });
      setForm(analysisFromPage(data.page));
      toast.success("Página procesada · vectores guardados en corpus.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error en el Agente de Visión.",
      );
      void loadNotebook();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!activePage) return;
    setIsSaving(true);
    try {
      const data = await fetchJson<{ page: NotebookPageDto }>(
        `/api/cuadernos/pages/${activePage.id}/analysis`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      setNotebook((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pages: prev.pages.map((p) => (p.id === data.page.id ? data.page : p)),
        };
      });
      setForm(analysisFromPage(data.page));
      toast.success("Análisis guardado (HITL).");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        await fetchJson<{ page: NotebookPageDto }>(
          `/api/cuadernos/${notebookId}/pages`,
          { method: "POST", body: formData },
        );
      }
      await loadNotebook();
      toast.success("Página(s) agregada(s) al cuaderno.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo subir la imagen.",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addTag = () => {
    const tag = tagDraft.trim();
    if (!tag) return;
    if (form.semanticTags.includes(tag)) {
      setTagDraft("");
      return;
    }
    setForm((prev) => ({
      ...prev,
      semanticTags: [...prev.semanticTags, tag],
    }));
    setTagDraft("");
  };

  const addNer = (kind: keyof PageNerEntities) => {
    const label = nerDraft[kind].trim();
    if (!label) return;
    setForm((prev) => ({
      ...prev,
      ner: {
        ...prev.ner,
        [kind]: prev.ner[kind].includes(label)
          ? prev.ner[kind]
          : [...prev.ner[kind], label],
      },
    }));
    setNerDraft((prev) => ({ ...prev, [kind]: "" }));
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <p>Cuaderno no encontrado.</p>
        <Link
          href="/ingesta/cuadernos"
          className="font-mono text-[10px] text-muted-foreground underline"
        >
          Volver al panal
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/ingesta/cuadernos"
            className="inline-flex items-center gap-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-foreground/80"
          >
            <ArrowLeftIcon className="size-3.5" />
            Panal
          </Link>
          <div className="min-w-0 border-l border-border pl-3">
            <p className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
              Espejo · Split Pane
            </p>
            <h1 className="truncate text-sm font-medium">{notebook.title}</h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            multiple
            className="hidden"
            onChange={(e) => void handleUpload(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="border-border bg-background text-foreground/80 hover:bg-card"
          >
            {isUploading ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <UploadIcon className="size-3.5" />
            )}
            <span className="hidden sm:inline">Agregar página</span>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {activePage ? (
          <>
            {/* Izquierda: imagen + paginación */}
            <section className="flex min-w-0 flex-1 flex-col border-r border-border lg:w-1/2 lg:flex-none">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={activeIndex === 0}
                    onClick={() => setActiveIndex((i) => i - 1)}
                    className="rounded px-2 py-1 font-mono text-[10px] text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30"
                  >
                    ◀ Anterior
                  </button>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Página {activeIndex + 1} / {notebook.pages.length}
                  </span>
                  <button
                    type="button"
                    disabled={activeIndex >= notebook.pages.length - 1}
                    onClick={() => setActiveIndex((i) => i + 1)}
                    className="rounded px-2 py-1 font-mono text-[10px] text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30"
                  >
                    Siguiente ▶
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    id="quanta-toggle"
                    checked={showQuanta}
                    onCheckedChange={setShowQuanta}
                    label="Quántomos"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={isProcessing || activePage.status === "PROCESSING"}
                    onClick={() => void handleProcess()}
                    className="bg-primary text-primary-foreground hover:bg-foreground"
                  >
                    {isProcessing ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <ScanEyeIcon className="size-3.5" />
                    )}
                    Visión
                  </Button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-auto bg-background p-4">
                <div className="relative mx-auto max-w-3xl">
                  <div className="relative overflow-hidden rounded border border-border shadow-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activePage.imageUrl}
                      alt={`Página ${activePage.pageNumber}`}
                      className="block h-auto w-full"
                    />
                    <QuantaOverlay
                      quanta={activePage.quanta ?? []}
                      visible={showQuanta && activePage.status === "COMPLETED"}
                    />
                  </div>
                </div>
              </div>

              <footer className="shrink-0 border-t border-border px-4 py-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                <span
                  className={cn(
                    activePage.status === "COMPLETED" && "text-primary",
                    activePage.status === "ERROR" && "text-destructive",
                    activePage.status === "PROCESSING" && "text-accent",
                  )}
                >
                  {STATUS_LABEL[activePage.status] ?? activePage.status}
                </span>
              </footer>
            </section>

            {/* Derecha: formulario HITL */}
            <aside className="flex min-h-0 w-full flex-col overflow-y-auto lg:w-1/2">
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  Átomo editable
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => void handleSaveAnalysis()}
                  className="bg-primary text-foreground hover:bg-primary"
                >
                  {isSaving ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <SaveIcon className="size-3.5" />
                  )}
                  Guardar
                </Button>
              </div>

              <div className="space-y-4 px-4 py-4">
                <label className="block space-y-1">
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    Título sugerido
                  </span>
                  <input
                    value={form.suggestedTitle}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        suggestedTitle: e.target.value,
                      }))
                    }
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-border"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    Explicación
                  </span>
                  <textarea
                    value={form.explanation}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        explanation: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-border"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    Descripción del contenido escrito
                  </span>
                  <textarea
                    value={form.writtenContentDescription}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        writtenContentDescription: e.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-border"
                  />
                </label>

                <div className="space-y-2">
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    Tags semánticos
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {form.semanticTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-foreground/80"
                      >
                        {tag}
                        <button
                          type="button"
                          aria-label={`Quitar ${tag}`}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              semanticTags: prev.semanticTags.filter(
                                (t) => t !== tag,
                              ),
                            }))
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <XIcon className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={tagDraft}
                      onChange={(e) => setTagDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Nuevo tag"
                      className="min-w-0 flex-1 rounded border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTag}
                      className="border-border"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    Entidades NER
                  </span>
                  {NER_KEYS.map((kind) => (
                    <div key={kind} className="space-y-1.5">
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {NER_LABEL[kind]}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {form.ner[kind].map((entity) => (
                          <span
                            key={`${kind}-${entity}`}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 px-2.5 py-0.5 text-[11px] text-foreground"
                          >
                            {entity}
                            <button
                              type="button"
                              aria-label={`Quitar ${entity}`}
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  ner: {
                                    ...prev.ner,
                                    [kind]: prev.ner[kind].filter(
                                      (e) => e !== entity,
                                    ),
                                  },
                                }))
                              }
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <XIcon className="size-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={nerDraft[kind]}
                          onChange={(e) =>
                            setNerDraft((prev) => ({
                              ...prev,
                              [kind]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addNer(kind);
                            }
                          }}
                          placeholder={`Añadir ${NER_LABEL[kind].toLowerCase()}`}
                          className="min-w-0 flex-1 rounded border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addNer(kind)}
                          className="border-border"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini índice de páginas en móvil */}
                <div className="border-t border-border pt-3 lg:hidden">
                  <div className="flex flex-wrap gap-1">
                    {notebook.pages.map((page, index) => (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={cn(
                          "rounded px-2 py-1 font-mono text-[10px]",
                          index === activeIndex
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-card",
                        )}
                      >
                        p.{page.pageNumber}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
            <p className="font-mono text-[10px] tracking-widest uppercase">
              Cuaderno sin páginas
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="border-border bg-background"
            >
              <UploadIcon className="size-4" />
              Subir primera página
            </Button>
          </div>
        )}
      </div>

      {/* Índice lateral desktop */}
      {notebook.pages.length > 0 ? (
        <div className="pointer-events-none absolute bottom-4 left-4 hidden md:block">
          <div className="pointer-events-auto max-h-40 overflow-y-auto rounded border border-border bg-background/90 p-2 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-0.5">
              {notebook.pages.map((page, index) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded px-2 py-1 font-mono text-[10px]",
                    index === activeIndex
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-card hover:text-foreground/80",
                  )}
                >
                  <span>p.{page.pageNumber}</span>
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      page.status === "COMPLETED" && "bg-primary",
                      page.status === "PENDING" && "bg-muted",
                      page.status === "PROCESSING" &&
                        "animate-pulse bg-accent/20",
                      page.status === "ERROR" && "bg-destructive/20",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
