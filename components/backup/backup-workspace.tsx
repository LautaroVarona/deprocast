"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDeployLabel } from "@/lib/deploy-env";
import { cn } from "@/lib/utils";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  HardDriveDownloadIcon,
  Loader2Icon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

type UploadState = "idle" | "uploading" | "done" | "error";

const CONFIRM_TEXT = "RESTAURAR";

export function BackupWorkspace() {
  const isVercel = getDeployLabel() === "Vercel";
  const inputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      const response = await fetch("/api/backup/export");

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "No se pudo generar la copia.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(
        /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i,
      );
      const filename = decodeURIComponent(
        filenameMatch?.[1] ??
          filenameMatch?.[2] ??
          "deprocast-backup.deprocast-backup.zip",
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);

      toast.success("Copia de seguridad descargada correctamente.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al exportar.";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const resetImportState = useCallback(() => {
    setShowConfirm(false);
    setConfirmInput("");
    setPendingFile(null);
    setFileName(null);
    setUploadStatus("idle");
    setErrorMessage(null);
  }, []);

  const executeImport = useCallback(
    async (file: File) => {
      setUploadStatus("uploading");
      setErrorMessage(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("confirm", "RESTORE");

        const response = await fetch("/api/backup/import", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          stats?: { totalBytes: number };
        };

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo restaurar la copia.");
        }

        setUploadStatus("done");
        toast.success("Copia restaurada. Recargando la aplicación…");

        window.setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error al importar.";
        setUploadStatus("error");
        setErrorMessage(message);
        toast.error(message);
      }
    },
    [],
  );

  const handleFileSelected = useCallback((file: File) => {
    const lowerName = file.name.toLowerCase();
    if (
      !lowerName.endsWith(".zip") &&
      !lowerName.endsWith(".deprocast-backup.zip")
    ) {
      toast.error("Seleccioná un archivo .deprocast-backup.zip o .zip válido.");
      return;
    }

    setFileName(file.name);
    setPendingFile(file);
    setShowConfirm(true);
    setConfirmInput("");
    setUploadStatus("idle");
    setErrorMessage(null);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);

      if (isVercel) return;

      const file = event.dataTransfer.files[0];
      if (file) {
        handleFileSelected(file);
      }
    },
    [handleFileSelected, isVercel],
  );

  const canConfirmRestore = confirmInput.trim() === CONFIRM_TEXT;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Copia de seguridad
        </h1>
        <p className="text-sm text-muted-foreground">
          Exportá o restaurá el estado completo de Deprocast: base de datos,
          diario, proyectos, documentos, audios y grafo de conocimiento.
        </p>
      </div>

      {isVercel ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p>
              La copia de seguridad solo está disponible en entorno local. En
              Vercel los datos son efímeros y esta función está deshabilitada.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Exportar
            </p>
            <p className="text-sm text-muted-foreground">
              Genera un único archivo{" "}
              <code className="text-xs">.deprocast-backup.zip</code> con SQLite,
              carpetas <code className="text-xs">data/</code> y{" "}
              <code className="text-xs">uploads/</code>.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => void handleExport()}
            disabled={isExporting || isVercel}
          >
            {isExporting ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <DownloadIcon />
            )}
            {isExporting ? "Generando copia…" : "Descargar copia completa"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Importar
            </p>
            <p className="text-sm text-muted-foreground">
              Reemplaza todos los datos locales con el contenido del archivo de
              copia. Esta acción es destructiva e irreversible.
            </p>
          </div>

          <div
            role="button"
            tabIndex={isVercel ? -1 : 0}
            onKeyDown={(event) => {
              if (isVercel) return;
              if (event.key === "Enter" || event.key === " ") {
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!isVercel) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => {
              if (!isVercel) inputRef.current?.click();
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30 hover:bg-muted/50",
              isVercel && "cursor-not-allowed opacity-50",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip,.deprocast-backup.zip,application/zip"
              className="hidden"
              disabled={isVercel}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFileSelected(file);
                event.target.value = "";
              }}
            />

            {uploadStatus === "uploading" ? (
              <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
            ) : uploadStatus === "done" ? (
              <CheckCircle2Icon className="size-8 text-green-600" />
            ) : uploadStatus === "error" ? (
              <XCircleIcon className="size-8 text-destructive" />
            ) : (
              <UploadCloudIcon className="size-8 text-muted-foreground" />
            )}

            <div className="text-center">
              <p className="text-sm font-medium">
                Arrastrá el archivo de copia o hacé clic para seleccionar
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                .deprocast-backup.zip
              </p>
              {fileName ? (
                <p className="mt-2 font-mono text-xs text-foreground">
                  {fileName}
                </p>
              ) : null}
            </div>
          </div>

          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Copias muy grandes (&gt;500 MB) pueden requerir suficiente memoria
            RAM durante la importación.
          </p>
        </CardContent>
      </Card>

      {showConfirm && pendingFile ? (
        <Card className="border-destructive/40">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <HardDriveDownloadIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="space-y-2">
                <p className="font-medium text-destructive">
                  Confirmación destructiva
                </p>
                <p className="text-sm text-muted-foreground">
                  Esto reemplazará TODOS los datos locales: base de datos,
                  diario, proyectos, audios, grafo y cola de validación. El
                  estado actual se perderá de forma permanente.
                </p>
                <p className="text-sm">
                  Escribí <strong>{CONFIRM_TEXT}</strong> para continuar con{" "}
                  <span className="font-mono text-xs">{pendingFile.name}</span>.
                </p>
              </div>
            </div>

            <input
              type="text"
              value={confirmInput}
              onChange={(event) => setConfirmInput(event.target.value)}
              placeholder={CONFIRM_TEXT}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              autoComplete="off"
              spellCheck={false}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={!canConfirmRestore || uploadStatus === "uploading"}
                onClick={() => void executeImport(pendingFile)}
              >
                {uploadStatus === "uploading" ? (
                  <Loader2Icon className="animate-spin" />
                ) : null}
                Restaurar copia
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={uploadStatus === "uploading"}
                onClick={resetImportState}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
