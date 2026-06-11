"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MAX_BASE_WEIGHT,
  MIN_BASE_WEIGHT,
  type SourceType,
} from "@/lib/document-constants";
import { cn } from "@/lib/utils";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SOURCE_TYPE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: "personal_writing", label: "Escrito personal" },
  { value: "ai_chat", label: "Chat con IA" },
  { value: "ai_report", label: "Reporte de IA" },
  { value: "web_clip", label: "Recorte web" },
  { value: "book_excerpt", label: "Extracto de libro" },
];

const DEFAULT_WEIGHT = 6;
const DEFAULT_SOURCE_TYPE: SourceType = "ai_chat";

export function TextIngestForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>(DEFAULT_SOURCE_TYPE);
  const [baseWeight, setBaseWeight] = useState(DEFAULT_WEIGHT);
  const [isSaving, setIsSaving] = useState(false);

  const canSave = content.trim().length > 0 && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          source_type: sourceType,
          base_weight: baseWeight,
          content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar el documento");
      }

      toast.success(`Documento guardado: ${data.filename}`);
      setTitle("");
      setContent("");
      setSourceType(DEFAULT_SOURCE_TYPE);
      setBaseWeight(DEFAULT_WEIGHT);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar el documento";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingesta manual de textos</CardTitle>
        <CardDescription>
          Pegá un texto crudo (chat, reporte o escrito) y guardalo como
          Markdown en la cola local de procesamiento.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="space-y-1.5">
          <label
            htmlFor="ingest-title"
            className="text-sm font-medium text-foreground"
          >
            Título <span className="text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="ingest-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Mi escrito sobre..."
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="ingest-content"
            className="text-sm font-medium text-foreground"
          >
            Texto crudo
          </label>
          <textarea
            id="ingest-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Pegá acá el chat completo, reporte o escrito..."
            rows={10}
            className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Tipo de fuente</p>
          <div className="flex flex-wrap gap-2">
            {SOURCE_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSourceType(option.value)}
                aria-pressed={sourceType === option.value}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  sourceType === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="ingest-weight"
            className="text-sm font-medium text-foreground"
          >
            Peso base:{" "}
            <span className="font-semibold tabular-nums">{baseWeight}</span>
            <span className="text-muted-foreground"> / {MAX_BASE_WEIGHT}</span>
          </label>
          <input
            id="ingest-weight"
            type="range"
            min={MIN_BASE_WEIGHT}
            max={MAX_BASE_WEIGHT}
            step={1}
            value={baseWeight}
            onChange={(event) => setBaseWeight(Number(event.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <div>
          <Button type="button" disabled={!canSave} onClick={handleSave}>
            {isSaving ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <SaveIcon />
            )}
            {isSaving ? "Guardando..." : "Guardar localmente"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
