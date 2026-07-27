"use client";

import { useBabel } from "@/components/babel/babel-context";
import { Button } from "@/components/ui/button";
import {
  WorkspaceModal,
  WorkspaceModalHeader,
} from "@/components/ui/workspace-modal";
import { notifyDomainRefresh } from "@/lib/domain-refresh";
import type { Persona } from "@/lib/personas/model";
import { personaSlugFromName } from "@/lib/personas/slug";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FileJsonIcon,
  Loader2Icon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type PreviewItem = {
  nombrePrincipal: string;
  aliases: string[];
  crmModulesFilled: string[];
  connectionCount: number;
  warnings: string[];
};

type ProsopografoWorkspaceProps = {
  /** Si true, solo el cuerpo (sin page chrome). */
  embedded?: boolean;
  className?: string;
  onImported?: (personas: Persona[]) => void;
};

function ProsopografoBody({
  onImported,
}: {
  onImported?: (personas: Persona[]) => void;
}) {
  const { universeFetch } = useBabel();
  const fileRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [schemaVersion, setSchemaVersion] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastCreated, setLastCreated] = useState<Persona[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoadingPrompt(true);
      try {
        const res = await fetch("/api/agentes/prosopografo/prompt", {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          prompt?: string;
          schemaVersion?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "No se pudo cargar el prompt.");
        if (!cancelled) {
          setPrompt(data.prompt ?? "");
          setSchemaVersion(data.schemaVersion ?? "");
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Error al cargar el cuestionario.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingPrompt(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const copyPrompt = useCallback(async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success("Prompt copiado. Pegalo en Gemini u otro LLM.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar al portapapeles.");
    }
  }, [prompt]);

  const downloadPrompt = useCallback(() => {
    if (!prompt) return;
    const blob = new Blob([prompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prosopografo-cuestionario-v${schemaVersion || "1"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Cuestionario descargado.");
  }, [prompt, schemaVersion]);

  const runPreview = useCallback(async () => {
    if (!jsonText.trim()) {
      toast.error("Pegá o subí un JSON primero.");
      return;
    }
    setIsPreviewing(true);
    setPreview(null);
    try {
      const res = await universeFetch("/api/agentes/prosopografo/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: jsonText, dryRun: true }),
      });
      const data = (await res.json()) as {
        preview?: PreviewItem[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Preview falló.");
      setPreview(data.preview ?? []);
      if ((data.preview ?? []).length === 0) {
        toast.error("No se detectaron personas en el JSON.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al previsualizar.",
      );
    } finally {
      setIsPreviewing(false);
    }
  }, [jsonText, universeFetch]);

  const runImport = useCallback(async () => {
    if (!jsonText.trim()) {
      toast.error("Pegá o subí un JSON primero.");
      return;
    }
    setIsImporting(true);
    try {
      const res = await universeFetch("/api/agentes/prosopografo/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: jsonText }),
      });
      const data = (await res.json()) as {
        personas?: Persona[];
        created?: number;
        errors?: Array<{ nombrePrincipal: string; error: string }>;
        warnings?: string[];
        error?: string;
      };
      if (!res.ok && res.status !== 207) {
        throw new Error(data.error ?? "Importación falló.");
      }

      const personas = data.personas ?? [];
      setLastCreated(personas);
      notifyDomainRefresh("all", "prosopografo-import");

      if (personas.length > 0) {
        toast.success(
          personas.length === 1
            ? `${personas[0].nombrePrincipal} importada.`
            : `${personas.length} personas importadas.`,
        );
        onImported?.(personas);
      }

      for (const warning of data.warnings ?? []) {
        toast.message(warning);
      }
      for (const err of data.errors ?? []) {
        toast.error(`${err.nombrePrincipal}: ${err.error}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al importar.",
      );
    } finally {
      setIsImporting(false);
    }
  }, [jsonText, onImported, universeFetch]);

  const onFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      setJsonText(text);
      setPreview(null);
      toast.success(`Archivo ${file.name} cargado.`);
    } catch {
      toast.error("No se pudo leer el archivo.");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-mono text-xs font-semibold tracking-wider uppercase">
              A · Exportar cuestionario
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Copiá el prompt, pegalo en Gemini (u otro LLM) con el contexto de
              la persona, y pedile el JSON.
              {schemaVersion ? (
                <span className="ml-1 font-mono text-[10px]">
                  v{schemaVersion}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void copyPrompt()}
              disabled={isLoadingPrompt || !prompt}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copiado" : "Copiar prompt"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={downloadPrompt}
              disabled={isLoadingPrompt || !prompt}
            >
              <DownloadIcon />
              Descargar .md
            </Button>
          </div>
        </div>
        <pre className="max-h-40 overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {isLoadingPrompt ? "Cargando cuestionario…" : prompt.slice(0, 900)}
          {!isLoadingPrompt && prompt.length > 900 ? "…" : ""}
        </pre>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-mono text-xs font-semibold tracking-wider uppercase">
              B · Pegar / importar JSON
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Pegá el JSON bruto que devolvió el LLM, o subí un archivo .json.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                void onFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
            >
              <UploadIcon />
              Subir .json
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void runPreview()}
              disabled={isPreviewing || !jsonText.trim()}
            >
              {isPreviewing && <Loader2Icon className="animate-spin" />}
              Preview
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void runImport()}
              disabled={isImporting || !jsonText.trim()}
            >
              {isImporting && <Loader2Icon className="animate-spin" />}
              <FileJsonIcon />
              Importar a CRM
            </Button>
          </div>
        </div>
        <textarea
          value={jsonText}
          onChange={(event) => {
            setJsonText(event.target.value);
            setPreview(null);
          }}
          rows={10}
          placeholder='{"personas":[{"nombrePrincipal":"…"}]}'
          className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          spellCheck={false}
        />
      </section>

      {preview && preview.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-mono text-xs font-semibold tracking-wider uppercase">
            Preview · {preview.length} persona
            {preview.length === 1 ? "" : "s"}
          </h2>
          <ul className="space-y-2">
            {preview.map((item) => (
              <li
                key={item.nombrePrincipal}
                className="rounded-lg border border-border bg-background p-3"
              >
                <p className="text-sm font-medium">{item.nombrePrincipal}</p>
                {item.aliases.length > 0 && (
                  <p className="font-mono text-[10px] text-muted-foreground">
                    aliases: {item.aliases.join(", ")}
                  </p>
                )}
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  CRM:{" "}
                  {item.crmModulesFilled.length
                    ? item.crmModulesFilled.join(", ")
                    : "solo nombre"}
                  {" · "}
                  vínculos resueltos: {item.connectionCount}
                </p>
                {item.warnings.map((warning) => (
                  <p
                    key={warning}
                    className="mt-1 text-[11px] text-amber-600 dark:text-amber-400"
                  >
                    {warning}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lastCreated.length > 0 && (
        <section className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <h2 className="font-mono text-xs font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
            Importadas
          </h2>
          <ul className="space-y-1 text-sm">
            {lastCreated.map((persona) => (
              <li key={persona.id}>
                <Link
                  href={`/personas/${personaSlugFromName(persona.nombrePrincipal)}`}
                  className="text-primary hover:underline"
                >
                  {persona.nombrePrincipal}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/personas"
            className="inline-block text-xs text-muted-foreground hover:text-foreground"
          >
            Ir a lista de personas →
          </Link>
        </section>
      )}
    </div>
  );
}

export function ProsopografoWorkspace({
  embedded = false,
  className,
  onImported,
}: ProsopografoWorkspaceProps) {
  if (embedded) {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
        <ProsopografoBody onImported={onImported} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-background",
        className,
      )}
    >
      <header className="shrink-0 border-b border-border px-4 py-3 sm:px-6">
        <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          Agente · Prosopógrafo
        </p>
        <h1 className="text-base font-semibold">
          Cuestionario externo → JSON → Persona
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Exportá el prompt a Gemini, importá el JSON y coagulá fichas en el CRM.
        </p>
      </header>
      <ProsopografoBody onImported={onImported} />
    </div>
  );
}

type ProsopografoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (personas: Persona[]) => void;
};

export function ProsopografoModal({
  open,
  onOpenChange,
  onImported,
}: ProsopografoModalProps) {
  return (
    <WorkspaceModal open={open} onOpenChange={onOpenChange}>
      <WorkspaceModalHeader
        title="Prosopógrafo"
        description="Copiar cuestionario · Pegar JSON · Importar persona"
        onClose={() => onOpenChange(false)}
      />
      <ProsopografoWorkspace
        embedded
        onImported={(personas) => {
          onImported?.(personas);
          if (personas.length > 0) onOpenChange(false);
        }}
      />
    </WorkspaceModal>
  );
}
