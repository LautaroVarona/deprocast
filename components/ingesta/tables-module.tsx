"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEFAULT_CAMPO_SLUG,
  getDefaultCampo,
  type CampoInfo,
  type CampoSlug,
} from "@/lib/projects/campos";
import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  CrownIcon,
  FileSpreadsheetIcon,
  GaugeIcon,
  Loader2Icon,
  Rows3Icon,
  TableIcon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type UploadState = "idle" | "uploading" | "done" | "error";

type ImportResponse = {
  imported: number;
  skipped: number;
  totalRows: number;
  files: string[];
  errors: string[];
  columnMapping: Record<string, string>;
  error?: string;
};

export function TablesModule() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [campos, setCampos] = useState<CampoInfo[]>([getDefaultCampo()]);
  const [campoSlug, setCampoSlug] = useState<CampoSlug>(DEFAULT_CAMPO_SLUG);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ImportResponse | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/proyectos", { cache: "no-store" });
        if (!response.ok) return;
        const data: { campos?: CampoInfo[] } = await response.json();
        if (data.campos?.length) setCampos(data.campos);
      } catch {
        // Mantener el default local
      }
    })();
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setStatus("uploading");
      setErrorMessage(null);
      setLastResult(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("campoSlug", campoSlug);

        const response = await fetch("/api/ingesta/tablas", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as ImportResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo transmutar la tabla");
        }

        setStatus("done");
        setLastResult(data);

        toast.success(
          data.imported === 1
            ? "1 proyecto estructurado en local"
            : `${data.imported} proyectos estructurados en local`,
        );

        if (data.skipped > 0) {
          toast.warning(
            `${data.skipped} fila(s) omitida(s) por datos insuficientes o duplicados.`,
          );
        }
      } catch (error) {
        setStatus("error");
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo transmutar la tabla";
        setErrorMessage(message);
        toast.error(message);
      }
    },
    [campoSlug],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      void uploadFile(file);
    },
    [uploadFile],
  );

  const targetHint = `data/projects/${campoSlug}/`;

  return (
    <section aria-label="Transmutación de tablas" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400">
          <TableIcon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">
            Transmutación de Tablas (Excel / CSV)
          </h3>
          <p className="text-xs text-muted-foreground">
            Cualquier tabla estructurada se mapea dinámicamente a proyectos
            Markdown en el Atanor local.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="tables-campo"
          className="text-sm font-medium text-foreground"
        >
          Campo de destino
        </label>
        <select
          id="tables-campo"
          value={campoSlug}
          onChange={(event) => setCampoSlug(event.target.value as CampoSlug)}
          disabled={status === "uploading"}
          className="h-9 w-full max-w-md rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {campos.map((campo) => (
            <option key={campo.slug} value={campo.slug}>
              {campo.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Destino:{" "}
          <span className="font-mono">{targetHint}</span>
        </p>
      </div>

      <Card
        className={cn(
          "border-dashed transition-colors",
          isDragging && "border-orange-500 bg-orange-500/5",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-orange-500/10">
            <UploadCloudIcon className="size-7 text-orange-600" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-medium">
              Arrastrá tu .xlsx o .csv para transmutarlo
            </p>
            <p className="text-sm text-muted-foreground">
              El motor detecta columnas de Nombre, Prioridad, Tags, Área, Horas,
              Avance y Descripción de forma flexible.
            </p>
          </div>
          <Button
            type="button"
            disabled={status === "uploading"}
            onClick={() => inputRef.current?.click()}
          >
            {status === "uploading" ? "Transmutando..." : "Seleccionar archivo"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = "";
            }}
          />

          {fileName && (
            <div className="flex w-full max-w-md items-center gap-2 rounded-md border px-3 py-2 text-left text-sm">
              {status === "uploading" && (
                <Loader2Icon className="size-4 shrink-0 animate-spin text-orange-600" />
              )}
              {status === "done" && (
                <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600" />
              )}
              {status === "error" && (
                <XCircleIcon className="size-4 shrink-0 text-destructive" />
              )}
              {status === "idle" && (
                <FileSpreadsheetIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate">{fileName}</span>
              {errorMessage && (
                <span className="text-xs text-destructive">{errorMessage}</span>
              )}
            </div>
          )}

          {lastResult && status === "done" && (
            <div className="w-full max-w-md rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-left text-sm">
              <p className="font-medium text-emerald-800 dark:text-emerald-300">
                {lastResult.imported} proyecto(s) estructurado(s) ·{" "}
                {lastResult.totalRows} fila(s) detectada(s)
              </p>
              {lastResult.skipped > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {lastResult.skipped} fila(s) omitida(s)
                </p>
              )}
              {Object.keys(lastResult.columnMapping ?? {}).length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Columnas mapeadas:{" "}
                  {Object.entries(lastResult.columnMapping)
                    .map(([key, header]) => `${key}→${header}`)
                    .join(", ")}
                </p>
              )}
            </div>
          )}

          <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
            {[
              { icon: Rows3Icon, label: "Fila de la tabla" },
              { icon: GaugeIcon, label: "Gravedad 1–12" },
              { icon: CrownIcon, label: "Proyecto / Boss" },
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

          <p className="text-xs text-muted-foreground">
            Los proyectos también se gestionan en{" "}
            <Link
              href="/proyectos"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              /proyectos
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
