"use client";

import { ExportDomainAccordion, ExportDomainSelector } from "@/components/backup/export-domain-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  applyBrowserPreferences,
  collectBrowserPreferences,
} from "@/lib/backup/browser-preferences-client";
import type { ExportDomainId, DomainPreviewStat } from "@/lib/backup/domains";
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
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type UploadState = "idle" | "uploading" | "done" | "error";

const CONFIRM_FULL = "RESTAURAR";
const CONFIRM_PARTIAL = "RESTAURAR PARCIAL";

type ValidatedBackup = {
  manifest: {
    exportMode?: "full" | "partial";
    includedDomains?: ExportDomainId[];
    createdAt?: string;
    stats?: { totalBytes: number };
  };
  includedDomains: ExportDomainId[];
};

export function BackupWorkspace() {
  const isVercel = getDeployLabel() === "Vercel";
  const inputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isPartialExporting, setIsPartialExporting] = useState(false);
  const [previewStats, setPreviewStats] = useState<DomainPreviewStat[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(!isVercel);
  const [selectedExportDomains, setSelectedExportDomains] = useState<ExportDomainId[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [validatedBackup, setValidatedBackup] = useState<ValidatedBackup | null>(null);
  const [selectedImportDomains, setSelectedImportDomains] = useState<ExportDomainId[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (isVercel) {
      return;
    }

    let cancelled = false;

    async function loadPreview() {
      setIsPreviewLoading(true);
      try {
        const response = await fetch("/api/backup/preview");
        if (!response.ok) {
          throw new Error("No se pudo cargar la vista previa.");
        }

        const data = (await response.json()) as { domains: DomainPreviewStat[] };
        if (!cancelled) {
          setPreviewStats(data.domains);
        }
      } catch {
        if (!cancelled) {
          toast.error("No se pudo cargar el catálogo de dominios exportables.");
        }
      } finally {
        if (!cancelled) {
          setIsPreviewLoading(false);
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [isVercel]);

  const downloadBlob = useCallback((blob: Blob, response: Response, fallbackName: string) => {
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const filenameMatch = disposition.match(
      /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i,
    );
    const filename = decodeURIComponent(
      filenameMatch?.[1] ?? filenameMatch?.[2] ?? fallbackName,
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

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
      downloadBlob(blob, response, "deprocast-backup.deprocast-backup.zip");
      toast.success("Copia de seguridad descargada correctamente.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al exportar.";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }, [downloadBlob]);

  const handlePartialExport = useCallback(async () => {
    if (selectedExportDomains.length === 0) {
      toast.error("Seleccioná al menos un dominio para exportar.");
      return;
    }

    setIsPartialExporting(true);

    try {
      const body: {
        domains: ExportDomainId[];
        browserPreferences?: Record<string, unknown>;
      } = {
        domains: selectedExportDomains,
      };

      if (selectedExportDomains.includes("preferences")) {
        body.browserPreferences = collectBrowserPreferences();
      }

      const response = await fetch("/api/backup/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "No se pudo generar la copia parcial.");
      }

      const blob = await response.blob();
      downloadBlob(blob, response, "deprocast-backup-partial.deprocast-backup.zip");
      toast.success("Copia parcial descargada correctamente.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al exportar.";
      toast.error(message);
    } finally {
      setIsPartialExporting(false);
    }
  }, [downloadBlob, selectedExportDomains]);

  const resetImportState = useCallback(() => {
    setShowConfirm(false);
    setConfirmInput("");
    setPendingFile(null);
    setFileName(null);
    setUploadStatus("idle");
    setErrorMessage(null);
    setValidatedBackup(null);
    setSelectedImportDomains([]);
    setIsValidating(false);
  }, []);

  const executeImport = useCallback(
    async (file: File) => {
      setUploadStatus("uploading");
      setErrorMessage(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const isPartial = validatedBackup?.manifest.exportMode === "partial";

        if (isPartial) {
          formData.append("confirm", "RESTORE_PARTIAL");
          formData.append("domains", JSON.stringify(selectedImportDomains));
        } else {
          formData.append("confirm", "RESTORE");
        }

        const response = await fetch("/api/backup/import", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          browserPreferences?: Record<string, unknown> | null;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo restaurar la copia.");
        }

        if (data.browserPreferences) {
          applyBrowserPreferences(data.browserPreferences);
        }

        setUploadStatus("done");
        toast.success(
          isPartial
            ? "Dominios restaurados. Recargando la aplicación…"
            : "Copia restaurada. Recargando la aplicación…",
        );

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
    [selectedImportDomains, validatedBackup],
  );

  const validateSelectedFile = useCallback(async (file: File) => {
    setIsValidating(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/backup/validate", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => ({}))) as ValidatedBackup & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo validar el archivo.");
      }

      setValidatedBackup(data);
      setSelectedImportDomains(data.includedDomains ?? []);
      setShowConfirm(true);
      setConfirmInput("");
      setUploadStatus("idle");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al validar el archivo.";
      setErrorMessage(message);
      toast.error(message);
      setPendingFile(null);
      setFileName(null);
    } finally {
      setIsValidating(false);
    }
  }, []);

  const handleFileSelected = useCallback(
    (file: File) => {
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
      void validateSelectedFile(file);
    },
    [validateSelectedFile],
  );

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

  const isPartialBackup = validatedBackup?.manifest.exportMode === "partial";
  const requiredConfirm = isPartialBackup ? CONFIRM_PARTIAL : CONFIRM_FULL;
  const canConfirmRestore = confirmInput.trim() === requiredConfirm;
  const importDomainStats = previewStats.filter((stat) =>
    validatedBackup?.includedDomains.includes(stat.id),
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Copia de seguridad
        </h1>
        <p className="text-sm text-muted-foreground">
          Exportá o restaurá el estado de Deprocast: base de datos, diario,
          proyectos, documentos, audios, grafo, Ludus y más. Podés descargar una
          copia completa o elegir dominios específicos.
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
              Genera un archivo{" "}
              <code className="text-xs">.deprocast-backup.zip</code> con SQLite,
              carpetas <code className="text-xs">data/</code> y{" "}
              <code className="text-xs">uploads/</code> según tu selección.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => void handleExport()}
            disabled={isExporting || isPartialExporting || isVercel}
          >
            {isExporting ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <DownloadIcon />
            )}
            {isExporting ? "Generando copia…" : "Descargar copia completa"}
          </Button>

          {isPreviewLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Cargando dominios exportables…
            </div>
          ) : previewStats.length > 0 ? (
            <div className="space-y-4">
              <ExportDomainAccordion
                stats={previewStats}
                selected={selectedExportDomains}
                onChange={setSelectedExportDomains}
                disabled={isVercel || isExporting || isPartialExporting}
              />

              <p className="text-xs text-muted-foreground">
                Las copias parciales se pueden restaurar dominio por dominio.
                Restaurar solo algunos dominios puede dejar referencias cruzadas
                incompletas (por ejemplo, menciones del KG a fuentes ausentes).
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={() => void handlePartialExport()}
                disabled={
                  isExporting ||
                  isPartialExporting ||
                  isVercel ||
                  selectedExportDomains.length === 0
                }
              >
                {isPartialExporting ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <DownloadIcon />
                )}
                {isPartialExporting
                  ? "Generando copia parcial…"
                  : "Descargar selección"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Importar
            </p>
            <p className="text-sm text-muted-foreground">
              Restaurá una copia completa (reemplaza todo) o parcial (solo los
              dominios que elijas del archivo).
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

            {isValidating || uploadStatus === "uploading" ? (
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
              {isValidating ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Validando archivo…
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

      {showConfirm && pendingFile && validatedBackup ? (
        <Card className="border-destructive/40">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <HardDriveDownloadIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="space-y-2">
                <p className="font-medium text-destructive">
                  {isPartialBackup
                    ? "Confirmación de restauración parcial"
                    : "Confirmación destructiva"}
                </p>
                {isPartialBackup ? (
                  <p className="text-sm text-muted-foreground">
                    Se reemplazarán solo los dominios seleccionados del archivo{" "}
                    <span className="font-mono text-xs">{pendingFile.name}</span>.
                    El resto de tus datos locales se conservará.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Esto reemplazará TODOS los datos locales: base de datos,
                    diario, proyectos, audios, grafo y cola de validación. El
                    estado actual se perderá de forma permanente.
                  </p>
                )}
                <p className="text-sm">
                  Escribí <strong>{requiredConfirm}</strong> para continuar.
                </p>
              </div>
            </div>

            {isPartialBackup && importDomainStats.length > 0 ? (
              <ExportDomainSelector
                idPrefix="import"
                stats={importDomainStats}
                selected={selectedImportDomains}
                onChange={setSelectedImportDomains}
                disabled={uploadStatus === "uploading"}
              />
            ) : null}

            <input
              type="text"
              value={confirmInput}
              onChange={(event) => setConfirmInput(event.target.value)}
              placeholder={requiredConfirm}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              autoComplete="off"
              spellCheck={false}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={
                  !canConfirmRestore ||
                  uploadStatus === "uploading" ||
                  (isPartialBackup && selectedImportDomains.length === 0)
                }
                onClick={() => void executeImport(pendingFile)}
              >
                {uploadStatus === "uploading" ? (
                  <Loader2Icon className="animate-spin" />
                ) : null}
                {isPartialBackup ? "Restaurar dominios" : "Restaurar copia"}
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
