"use client";

import {
  confirmVisionAction,
  extractVisionFileAction,
} from "@/app/ingesta/actions";
import { useIngesta } from "@/components/ingesta/ingesta-context";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  Loader2Icon,
  SearchCheckIcon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

type UploadState = "idle" | "extracting" | "preview" | "confirming" | "done" | "error";

type VisionExtractResponse = {
  markdown: string;
  tachoPath: string;
  originalFilename: string;
  mimeType: string;
  error?: string;
};

function PurifiedPreview({ markdown }: { markdown: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto rounded border border-border bg-muted/50 p-2 font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-foreground/90">
      {markdown}
    </div>
  );
}

export function VisionChannel() {
  const { gravity } = useIngesta();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractResult, setExtractResult] = useState<VisionExtractResponse | null>(null);
  const [confirmedPath, setConfirmedPath] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch("/api/proyectos", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { projects: Project[] };
      setProjects(data.projects ?? []);
    } catch {
      // no crítico
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(
    () => projects.filter((project) => project.campoSlug === gravity.campoSlug),
    [projects, gravity.campoSlug],
  );

  useEffect(() => {
    if (projectId && !filteredProjects.some((p) => p.id === projectId)) {
      setProjectId("");
    }
  }, [filteredProjects, projectId]);

  const extractFile = useCallback(
    (file: File) => {
      if (!projectId) {
        toast.error("Seleccioná un proyecto de destino.");
        return;
      }

      setFileName(file.name);
      setStatus("extracting");
      setErrorMessage(null);
      setExtractResult(null);
      setConfirmedPath(null);

      const formData = new FormData();
      formData.append("file", file);

      startTransition(async () => {
        try {
          const data = await extractVisionFileAction(formData);
          if (data.error) {
            throw new Error(data.error);
          }

          setExtractResult(data as VisionExtractResponse);
          setStatus("preview");
          toast.success("Extracción OCR completada.");
        } catch (error) {
          setStatus("error");
          const message =
            error instanceof Error ? error.message : "No se pudo extraer el documento";
          setErrorMessage(message);
          toast.error(message);
        }
      });
    },
    [projectId],
  );

  const confirmSave = useCallback(() => {
    if (!extractResult || !projectId) return;
    setStatus("confirming");

    startTransition(async () => {
      try {
        const data = await confirmVisionAction({
          projectId,
          markdown: extractResult.markdown,
          originalFilename: extractResult.originalFilename,
          tachoPath: extractResult.tachoPath,
          mimeType: extractResult.mimeType,
        });

        if (data.error) {
          throw new Error(data.error);
        }

        setConfirmedPath(data.contextPath ?? null);
        setStatus("done");
        toast.success(`Contexto guardado: ${data.filename}`);
      } catch (error) {
        setStatus("preview");
        toast.error(error instanceof Error ? error.message : "Error al confirmar");
      }
    });
  }, [extractResult, projectId]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      extractFile(file);
    },
    [extractFile],
  );

  const isBusy = status === "extracting" || status === "confirming" || isPending;
  const canUpload = Boolean(projectId) && !isBusy;

  if ((status === "preview" || status === "confirming") && extractResult) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <p className="truncate font-mono text-[9px] text-muted-foreground">
            Vista previa · {fileName}
          </p>
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setStatus("idle");
                setExtractResult(null);
              }}
            >
              Descartar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={status === "confirming" || isPending}
              onClick={() => confirmSave()}
            >
              {status === "confirming" || isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SearchCheckIcon />
              )}
              Confirmar
            </Button>
          </div>
        </div>
        <PurifiedPreview markdown={extractResult.markdown} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <select
        value={projectId}
        onChange={(event) => setProjectId(event.target.value)}
        disabled={loadingProjects || isBusy}
        className="h-7 shrink-0 rounded border border-input bg-background px-2 font-mono text-[10px] outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      >
        <option value="">
          {loadingProjects
            ? "Cargando proyectos..."
            : filteredProjects.length === 0
              ? "Sin proyectos en este Campo"
              : "Proyecto de destino"}
        </option>
        {filteredProjects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.title}
          </option>
        ))}
      </select>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded border border-dashed border-border bg-muted/30 px-4 text-center transition-colors",
          isDragging && canUpload && "border-primary/50 bg-accent",
          !canUpload && "opacity-60",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          if (canUpload) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (canUpload) handleFiles(event.dataTransfer.files);
        }}
      >
        {isBusy ? (
          <Loader2Icon className="size-7 animate-spin text-violet-400" />
        ) : status === "done" ? (
          <CheckCircle2Icon className="size-7 text-emerald-400" />
        ) : (
          <UploadCloudIcon className="size-7 text-muted-foreground" />
        )}
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {fileName ?? "Imágenes / PDF → OCR Gemini"}
          </p>
          <p className="font-mono text-[9px] text-muted-foreground">
            Original en data/tacho/ · tachones preservados · análisis visual
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canUpload}
          onClick={() => inputRef.current?.click()}
        >
          {isBusy ? "Extrayendo..." : "Seleccionar archivo"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.heic,image/*,application/pdf"
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {status === "error" && errorMessage && (
        <p className="shrink-0 flex items-center gap-1.5 font-mono text-[10px] text-destructive">
          <XCircleIcon className="size-3.5" />
          {errorMessage}
        </p>
      )}

      {confirmedPath && status === "done" && (
        <p className="shrink-0 truncate font-mono text-[9px] text-emerald-400/80">
          {confirmedPath}
        </p>
      )}
    </div>
  );
}
