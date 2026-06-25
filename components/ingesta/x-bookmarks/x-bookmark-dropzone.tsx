"use client";

import { cn } from "@/lib/utils";
import { UploadIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";

type XBookmarkDropzoneProps = {
  onImport: (file: File) => Promise<void>;
  disabled?: boolean;
  className?: string;
};

export function XBookmarkDropzone({
  onImport,
  disabled = false,
  className,
}: XBookmarkDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || disabled) return;
      const file = files[0];
      await onImport(file);
    },
    [disabled, onImport],
  );

  return (
    <div
      className={cn(
        "relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/20 hover:border-ring hover:bg-muted/40",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        void handleFiles(event.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <UploadIcon className="mb-2 size-6 text-muted-foreground" aria-hidden />
      <p className="font-mono text-[11px] font-medium">Importar marcadores de X</p>
      <p className="mt-1 max-w-sm text-[10px] text-muted-foreground">
        Arrastrá o seleccioná un archivo <span className="font-mono">.json</span> o{" "}
        <span className="font-mono">.csv</span> exportado desde X / Twitter.
      </p>
    </div>
  );
}
