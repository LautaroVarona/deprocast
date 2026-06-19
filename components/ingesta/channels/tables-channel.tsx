"use client";

import { captureTableFileAction } from "@/app/ingesta/actions";
import { useIngesta } from "@/components/ingesta/ingesta-context";
import { Button } from "@/components/ui/button";
import { CAPTURE_SUCCESS_TOAST } from "@/lib/purifier/constants";
import { cn } from "@/lib/utils";
import {
  Loader2Icon,
  SparklesIcon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

type UploadState = "idle" | "uploading" | "done" | "error";

export function TablesChannel() {
  const { gravity } = useIngesta();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastReviewId, setLastReviewId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const uploadFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      setStatus("uploading");
      setErrorMessage(null);
      setLastReviewId(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("campoSlug", gravity.campoSlug);
      formData.append("onda", gravity.onda);
      formData.append("sourceType", gravity.sourceType);
      if (gravity.title.trim()) {
        formData.append("title", gravity.title.trim());
      }

      startTransition(async () => {
        try {
          const data = await captureTableFileAction(formData);

          if (data.error) {
            throw new Error(data.error);
          }

          const reviewId = "reviewId" in data ? data.reviewId : null;
          setLastReviewId(reviewId ?? null);
          setStatus("done");
          toast.success(CAPTURE_SUCCESS_TOAST, {
            description: "Tabla capturada · purificación en curso.",
            action: reviewId
              ? {
                  label: "Validar →",
                  onClick: () => {
                    window.location.href = `/validar?id=${reviewId}`;
                  },
                }
              : undefined,
          });
        } catch (error) {
          setStatus("error");
          const message =
            error instanceof Error
              ? error.message
              : "No se pudo capturar la tabla";
          setErrorMessage(message);
          toast.error(message);
        }
      });
    },
    [gravity],
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
        .xlsx · .csv → prima materia → purificación automática
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
            La tabla se convierte en prima materia y pasa por el purificador
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? (
            <>
              <Loader2Icon className="animate-spin" />
              Purificando…
            </>
          ) : (
            <>
              <SparklesIcon />
              Seleccionar archivo
            </>
          )}
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

      {lastReviewId && status === "done" && (
        <p className="shrink-0 font-mono text-[9px] text-muted-foreground">
          En cola de validación ·{" "}
          <Link
            href={`/validar?id=${lastReviewId}`}
            className="text-primary underline-offset-2 hover:underline"
          >
            Revisar →
          </Link>
        </p>
      )}
    </div>
  );
}
