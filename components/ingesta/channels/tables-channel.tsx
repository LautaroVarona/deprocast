"use client";

import { importTableFileAction } from "@/app/ingesta/actions";
import { useIngesta } from "@/components/ingesta/ingesta-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  Loader2Icon,
  Rows3Icon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
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

export function TablesChannel() {
  const { gravity } = useIngesta();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ImportResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const uploadFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      setStatus("uploading");
      setErrorMessage(null);
      setLastResult(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("campoSlug", gravity.campoSlug);

      startTransition(async () => {
        try {
          const data = await importTableFileAction(formData);

          if (data.error) {
            throw new Error(data.error);
          }

          const result = data as ImportResponse & { success?: boolean };
          setLastResult(result);
          setStatus("done");
          toast.success(
            `${result.imported} proyecto${result.imported === 1 ? "" : "s"} importado${result.imported === 1 ? "" : "s"}`,
          );
        } catch (error) {
          setStatus("error");
          const message =
            error instanceof Error
              ? error.message
              : "No se pudo transmutar la tabla";
          setErrorMessage(message);
          toast.error(message);
        }
      });
    },
    [gravity.campoSlug],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      uploadFile(file);
    },
    [uploadFile],
  );

  const isUploading = status === "uploading" || isPending;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <p className="shrink-0 font-mono text-[10px] text-muted-foreground">
        Destino:{" "}
        <span className="text-foreground/80">
          data/projects/{gravity.campoSlug}/
        </span>
      </p>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded border border-dashed border-border bg-muted/30 px-4 text-center transition-colors",
          isDragging && "border-primary/50 bg-accent",
          isUploading && "opacity-80",
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
        {isUploading ? (
          <Loader2Icon className="size-7 animate-spin text-primary" />
        ) : (
          <UploadCloudIcon className="size-7 text-muted-foreground" />
        )}
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {fileName ?? "Arrastrá .xlsx o .csv"}
          </p>
          <p className="font-mono text-[9px] text-muted-foreground">
            Mapeo dinámico: Nombre · Prioridad · Tags → proyectos .md
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          Seleccionar archivo
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
      </div>

      {status === "error" && errorMessage && (
        <p className="shrink-0 flex items-center gap-1.5 font-mono text-[10px] text-destructive">
          <XCircleIcon className="size-3.5" />
          {errorMessage}
        </p>
      )}

      {lastResult && status === "done" && (
        <div className="shrink-0 space-y-1 rounded border border-border bg-muted/50 p-2 font-mono text-[9px] text-muted-foreground">
          <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2Icon className="size-3" />
            {lastResult.imported} importados · {lastResult.skipped} omitidos ·{" "}
            {lastResult.totalRows} filas
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1">
              <Rows3Icon className="size-3" />
              {Object.keys(lastResult.columnMapping).length} columnas
            </span>
            <Link
              href="/proyectos"
              className="text-foreground underline-offset-2 hover:underline"
            >
              Ver tablero →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
