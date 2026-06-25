"use client";

import { QuantaOverlay } from "@/components/cuadernos/quanta-overlay";
import { Switch } from "@/components/cuadernos/switch";
import { Button } from "@/components/ui/button";
import type { NotebookDetail, NotebookPageDto } from "@/lib/cuadernos/types";
import { fetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  ScanEyeIcon,
  UploadIcon,
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

export function NotebookViewer({ notebookId }: NotebookViewerProps) {
  const [notebook, setNotebook] = useState<NotebookDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showQuanta, setShowQuanta] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#050505]">
        <Loader2Icon className="size-6 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#050505] text-zinc-500">
        <p>Cuaderno no encontrado.</p>
        <Link
          href="/ingesta/cuadernos"
          className="font-mono text-[10px] text-zinc-400 underline"
        >
          Volver al panal
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#050505] text-zinc-100">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-900 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/ingesta/cuadernos"
            className="inline-flex items-center gap-1 font-mono text-[10px] tracking-widest text-zinc-500 uppercase hover:text-zinc-300"
          >
            <ArrowLeftIcon className="size-3.5" />
            Panal
          </Link>
          <div className="min-w-0 border-l border-zinc-800 pl-3">
            <p className="font-mono text-[9px] tracking-[0.25em] text-zinc-600 uppercase">
              Páginas del Cuaderno
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
            className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
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
        <aside className="hidden w-44 shrink-0 flex-col border-r border-zinc-900 md:flex">
          <p className="px-3 py-2 font-mono text-[9px] tracking-widest text-zinc-600 uppercase">
            Índice
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {notebook.pages.length === 0 ? (
              <p className="px-1 py-4 text-center font-mono text-[9px] text-zinc-700">
                Sin páginas
              </p>
            ) : (
              notebook.pages.map((page, index) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "mb-1 flex w-full items-center justify-between rounded px-2 py-1.5 font-mono text-[10px] transition-colors",
                    index === activeIndex
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300",
                  )}
                >
                  <span>p.{page.pageNumber}</span>
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      page.status === "COMPLETED" && "bg-emerald-500",
                      page.status === "PENDING" && "bg-zinc-600",
                      page.status === "PROCESSING" && "bg-amber-400 animate-pulse",
                      page.status === "ERROR" && "bg-red-500",
                    )}
                  />
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          {activePage ? (
            <>
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-900 px-3 py-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={activeIndex === 0}
                    onClick={() => setActiveIndex((i) => i - 1)}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200 disabled:opacity-30"
                    aria-label="Página anterior"
                  >
                    <ChevronLeftIcon className="size-4" />
                  </button>
                  <span className="font-mono text-[10px] text-zinc-400">
                    {activeIndex + 1} / {notebook.pages.length}
                  </span>
                  <button
                    type="button"
                    disabled={activeIndex >= notebook.pages.length - 1}
                    onClick={() => setActiveIndex((i) => i + 1)}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200 disabled:opacity-30"
                    aria-label="Página siguiente"
                  >
                    <ChevronRightIcon className="size-4" />
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
                    className="bg-zinc-100 text-zinc-950 hover:bg-white"
                  >
                    {isProcessing ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <ScanEyeIcon className="size-3.5" />
                    )}
                    Agente de Visión
                  </Button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-auto bg-[#030303] p-4">
                <div className="relative mx-auto max-w-3xl">
                  <div className="relative overflow-hidden rounded border border-zinc-800 shadow-2xl">
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

              <footer className="shrink-0 border-t border-zinc-900 px-4 py-2">
                <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] tracking-wider text-zinc-500 uppercase">
                  <span
                    className={cn(
                      activePage.status === "COMPLETED" && "text-emerald-500",
                      activePage.status === "ERROR" && "text-red-400",
                      activePage.status === "PROCESSING" && "text-amber-400",
                    )}
                  >
                    {STATUS_LABEL[activePage.status] ?? activePage.status}
                  </span>
                  {activePage.quanta?.length ? (
                    <span>{activePage.quanta.length} quántomos</span>
                  ) : null}
                  {activePage.structuralVector?.tags.length ? (
                    <span>tags: {activePage.structuralVector.tags.join(", ")}</span>
                  ) : null}
                </div>
                {activePage.semanticVector && showQuanta ? (
                  <p className="mt-2 line-clamp-3 font-mono text-[10px] leading-relaxed text-zinc-600">
                    {activePage.semanticVector}
                  </p>
                ) : null}
              </footer>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-zinc-600">
              <p className="font-mono text-[10px] tracking-widest uppercase">
                Cuaderno sin páginas
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-zinc-800 bg-zinc-950"
              >
                <UploadIcon className="size-4" />
                Subir primera página
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
