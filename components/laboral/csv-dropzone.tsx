"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  Loader2Icon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type CsvDropzoneProps = {
  onImported: () => void;
};

type UploadState = "idle" | "uploading" | "done" | "error";

export function LaboralCsvDropzone({ onImported }: CsvDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setStatus("uploading");
      setErrorMessage(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/laboral/import", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo importar el CSV");
        }

        setStatus("done");
        onImported();
        toast.success(
          data.imported === 1
            ? "1 reto importado correctamente"
            : `${data.imported} retos importados correctamente`,
        );

        if (data.errors?.length) {
          toast.warning(
            `${data.skipped} fila(s) omitida(s). Revisá el formato del Excel.`,
          );
        }
      } catch (error) {
        setStatus("error");
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo importar el CSV";
        setErrorMessage(message);
        toast.error(message);
      }
    },
    [onImported],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      void uploadFile(file);
    },
    [uploadFile],
  );

  return (
    <Card
      className={cn(
        "border-dashed transition-colors",
        isDragging && "border-amber-500 bg-amber-500/5",
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
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/10">
          <UploadCloudIcon className="size-7 text-amber-600" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-medium">
            Arrastrá el CSV del control de retos IA
          </p>
          <p className="text-sm text-muted-foreground">
            Columnas del Excel{" "}
            <span className="font-mono text-xs">Control_IA_Despacho_Profesional</span>
            {" · "}
            se generan Markdown en{" "}
            <span className="font-mono text-xs">data/projects/laboral/pending/</span>
          </p>
        </div>
        <Button
          type="button"
          disabled={status === "uploading"}
          onClick={() => inputRef.current?.click()}
        >
          {status === "uploading" ? "Procesando..." : "Seleccionar CSV"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,text/csv"
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />

        {fileName && (
          <div className="flex w-full max-w-md items-center gap-2 rounded-md border px-3 py-2 text-left text-sm">
            {status === "uploading" && (
              <Loader2Icon className="size-4 shrink-0 animate-spin text-amber-600" />
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
      </CardContent>
    </Card>
  );
}
