"use client";

import { NotebookGallery } from "@/components/cuadernos/notebook-gallery";
import { Button } from "@/components/ui/button";
import type { NotebookSummary } from "@/lib/cuadernos/types";
import { fetchJson } from "@/lib/fetch-json";
import { ArrowLeftIcon, Loader2Icon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function CuadernosWorkspace() {
  const [notebooks, setNotebooks] = useState<NotebookSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const loadNotebooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchJson<{ notebooks: NotebookSummary[] }>(
        "/api/cuadernos",
        { cache: "no-store" },
      );
      setNotebooks(data.notebooks);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudieron cargar los cuadernos.",
      );
      setNotebooks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotebooks();
  }, [loadNotebooks]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }

    setIsCreating(true);
    try {
      await fetchJson<{ notebook: NotebookSummary }>("/api/cuadernos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      setTitle("");
      setDescription("");
      setShowForm(false);
      await loadNotebooks();
      toast.success("Cuaderno creado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear el cuaderno.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#050505] text-zinc-100">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-900 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/ingesta"
            className="inline-flex items-center gap-1 font-mono text-[10px] tracking-widest text-zinc-500 uppercase hover:text-zinc-300"
          >
            <ArrowLeftIcon className="size-3.5" />
            Ingesta
          </Link>
          <div className="min-w-0 border-l border-zinc-800 pl-3">
            <p className="font-mono text-[9px] tracking-[0.3em] text-zinc-600 uppercase">
              Módulo de Cuadernos
            </p>
            <h1 className="text-sm font-semibold tracking-tight">
              Galería Noir · Panal
            </h1>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="bg-zinc-100 text-zinc-950 hover:bg-white"
        >
          <PlusIcon className="size-3.5" />
          Nuevo cuaderno
        </Button>
      </header>

      {showForm ? (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="shrink-0 border-b border-zinc-900 bg-zinc-950/50 px-4 py-3"
        >
          <div className="mx-auto flex max-w-lg flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-mono text-[9px] tracking-widest text-zinc-600 uppercase">
                Título
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Cuaderno de campo · 2026"
                className="rounded border border-zinc-800 bg-[#050505] px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-mono text-[9px] tracking-widest text-zinc-600 uppercase">
                Descripción
              </span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
                className="rounded border border-zinc-800 bg-[#050505] px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
            </label>
            <Button
              type="submit"
              disabled={isCreating}
              className="bg-zinc-100 text-zinc-950 hover:bg-white"
            >
              {isCreating ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                "Crear"
              )}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <NotebookGallery notebooks={notebooks} isLoading={isLoading} />
      </div>
    </div>
  );
}
