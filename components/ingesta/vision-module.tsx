"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEFAULT_CAMPO_SLUG,
  getDefaultCampo,
  type CampoInfo,
  type CampoSlug,
} from "@/lib/projects/campos";
import type { Project } from "@/lib/projects/types";
import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  ScanEyeIcon,
  SearchCheckIcon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type UploadState = "idle" | "extracting" | "preview" | "confirming" | "done" | "error";

type VisionExtractResponse = {
  markdown: string;
  tachoPath: string;
  originalFilename: string;
  mimeType: string;
  error?: string;
};

type VisionConfirmResponse = {
  contextPath: string;
  filename: string;
  error?: string;
};

function renderPurifiedSegment(segment: string, key: number) {
  const strikethroughMatch = segment.match(/^~~([\s\S]*?)~~$/);
  if (strikethroughMatch) {
    return (
      <del
        key={key}
        className="rounded-sm bg-destructive/15 px-0.5 text-destructive decoration-destructive/70"
      >
        {strikethroughMatch[1]}
      </del>
    );
  }

  const annotationMatch = segment.match(/^\[Tachado:\s*([\s\S]*?)\]$/i);
  if (annotationMatch) {
    return (
      <span
        key={key}
        className="rounded-sm bg-amber-500/15 px-1 text-amber-800 line-through decoration-amber-700/70 dark:text-amber-200"
      >
        [Tachado: {annotationMatch[1]}]
      </span>
    );
  }

  return <span key={key}>{segment}</span>;
}

function PurifiedPreview({ markdown }: { markdown: string }) {
  const segments = useMemo(
    () => markdown.split(/(~~[\s\S]*?~~|\[Tachado:[^\]]+\])/gi),
    [markdown],
  );

  return (
    <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted/30 p-4 text-left text-sm leading-relaxed whitespace-pre-wrap">
      {segments.map((segment, index) => renderPurifiedSegment(segment, index))}
    </div>
  );
}

export function VisionModule() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [campos, setCampos] = useState<CampoInfo[]>([getDefaultCampo()]);
  const [campoSlug, setCampoSlug] = useState<CampoSlug>(DEFAULT_CAMPO_SLUG);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractResult, setExtractResult] = useState<VisionExtractResponse | null>(
    null,
  );
  const [confirmedPath, setConfirmedPath] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch("/api/proyectos", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as {
        projects: Project[];
        campos?: CampoInfo[];
      };
      setProjects(data.projects ?? []);
      if (data.campos?.length) {
        setCampos(data.campos);
        setCampoSlug((current) =>
          data.campos!.some((campo) => campo.slug === current)
            ? current
            : data.campos![0].slug,
        );
      }
    } catch {
      // No crítico para el módulo.
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(
    () => projects.filter((project) => project.campoSlug === campoSlug),
    [projects, campoSlug],
  );

  useEffect(() => {
    if (
      projectId &&
      !filteredProjects.some((project) => project.id === projectId)
    ) {
      setProjectId("");
    }
  }, [filteredProjects, projectId]);

  const extractFile = useCallback(
    async (file: File) => {
      if (!projectId) {
        toast.error("Seleccioná un proyecto de destino antes de subir el archivo.");
        return;
      }

      setFileName(file.name);
      setStatus("extracting");
      setErrorMessage(null);
      setExtractResult(null);
      setConfirmedPath(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/ingesta/vision", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as VisionExtractResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo extraer el documento");
        }

        setExtractResult(data);
        setStatus("preview");
        toast.success("Extracción completada. Revisá la vista previa.");
      } catch (error) {
        setStatus("error");
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo extraer el documento";
        setErrorMessage(message);
        toast.error(message);
      }
    },
    [projectId],
  );

  const confirmSave = useCallback(async () => {
    if (!extractResult || !projectId) return;

    setStatus("confirming");

    try {
      const response = await fetch("/api/ingesta/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          projectId,
          markdown: extractResult.markdown,
          originalFilename: extractResult.originalFilename,
          tachoPath: extractResult.tachoPath,
          mimeType: extractResult.mimeType,
        }),
      });

      const data = (await response.json()) as VisionConfirmResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo confirmar el contexto");
      }

      setConfirmedPath(data.contextPath);
      setStatus("done");
      toast.success(`Contexto guardado: ${data.filename}`);
    } catch (error) {
      setStatus("preview");
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo confirmar el contexto";
      toast.error(message);
    }
  }, [extractResult, projectId]);

  const resetFlow = useCallback(() => {
    setFileName(null);
    setStatus("idle");
    setErrorMessage(null);
    setExtractResult(null);
    setConfirmedPath(null);
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      void extractFile(file);
    },
    [extractFile],
  );

  const canUpload =
    Boolean(projectId) &&
    status !== "extracting" &&
    status !== "confirming";

  return (
    <section aria-label="Portal de visión" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
          <ScanEyeIcon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">
            Portal de Visión y Documentos (Imágenes / PDF)
          </h3>
          <p className="text-xs text-muted-foreground">
            OCR de alta fidelidad con Cohere. El original queda en{" "}
            <span className="font-mono">data/tacho/</span> y el contexto
            purificado se ancla al proyecto elegido.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="vision-campo"
            className="text-sm font-medium text-foreground"
          >
            Campo
          </label>
          <select
            id="vision-campo"
            value={campoSlug}
            onChange={(event) => {
              setCampoSlug(event.target.value as CampoSlug);
              setProjectId("");
            }}
            disabled={status === "extracting" || status === "confirming"}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {campos.map((campo) => (
              <option key={campo.slug} value={campo.slug}>
                {campo.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="vision-proyecto"
            className="text-sm font-medium text-foreground"
          >
            Proyecto de destino
          </label>
          <select
            id="vision-proyecto"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            disabled={
              loadingProjects || status === "extracting" || status === "confirming"
            }
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">
              {loadingProjects
                ? "Cargando proyectos..."
                : filteredProjects.length === 0
                  ? "No hay proyectos en este Campo"
                  : "Seleccioná un proyecto"}
            </option>
            {filteredProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card
        className={cn(
          "border-dashed transition-colors",
          isDragging && canUpload && "border-violet-500 bg-violet-500/5",
          !canUpload && "opacity-80",
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
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-violet-500/10">
            <UploadCloudIcon className="size-7 text-violet-600" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-medium">
              Arrastrá imágenes o PDFs para su lectura ocular
            </p>
            <p className="text-sm text-muted-foreground">
              Los tachones se preservan como{" "}
              <span className="font-mono text-xs">~~texto~~</span> o{" "}
              <span className="font-mono text-xs">[Tachado: …]</span>
            </p>
          </div>
          <Button
            type="button"
            disabled={!canUpload}
            onClick={() => inputRef.current?.click()}
          >
            {status === "extracting"
              ? "Extrayendo con Cohere..."
              : "Seleccionar archivo"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.gif,.heic,image/*"
            className="hidden"
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = "";
            }}
          />

          {fileName && (
            <div className="flex w-full max-w-md items-center gap-2 rounded-md border px-3 py-2 text-left text-sm">
              {status === "extracting" && (
                <Loader2Icon className="size-4 shrink-0 animate-spin text-violet-600" />
              )}
              {status === "done" && (
                <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600" />
              )}
              {status === "error" && (
                <XCircleIcon className="size-4 shrink-0 text-destructive" />
              )}
              {(status === "idle" ||
                status === "preview" ||
                status === "confirming") && (
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">{fileName}</span>
              {errorMessage && (
                <span className="text-xs text-destructive">{errorMessage}</span>
              )}
            </div>
          )}

          {extractResult && (status === "preview" || status === "confirming" || status === "done") && (
            <div className="w-full max-w-2xl space-y-3 text-left">
              <p className="text-sm font-medium">Vista previa purificada</p>
              <PurifiedPreview markdown={extractResult.markdown} />
              {status !== "done" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={status === "confirming"}
                    onClick={() => void confirmSave()}
                  >
                    {status === "confirming" ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <CheckCircle2Icon />
                    )}
                    {status === "confirming"
                      ? "Guardando..."
                      : "Confirmar en disco"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetFlow}>
                    Descartar
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
                  <p className="font-medium text-emerald-800 dark:text-emerald-300">
                    Contexto confirmado en el Atanor local
                  </p>
                  {confirmedPath && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {confirmedPath}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={resetFlow}
                  >
                    Procesar otro documento
                  </Button>
                </div>
              )}
            </div>
          )}

          <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
            {[
              { icon: ImageIcon, label: "Imagen / PDF" },
              { icon: FileTextIcon, label: "OCR descriptivo" },
              { icon: SearchCheckIcon, label: "Contexto indexable" },
            ].map((step, index, steps) => (
              <li
                key={step.label}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1">
                  <step.icon className="size-3.5 shrink-0" aria-hidden />
                  {step.label}
                </span>
                {index < steps.length - 1 && (
                  <span className="text-muted-foreground/50">→</span>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}
