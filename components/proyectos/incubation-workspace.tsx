"use client";

import { IncubationChatPanel } from "@/components/proyectos/incubation-chat-panel";
import { IncubationHitlPanel } from "@/components/proyectos/incubation-hitl-panel";
import { buttonVariants } from "@/components/ui/button";
import {
  DEFAULT_CAMPO_SLUG,
  getDefaultCampo,
  type CampoInfo,
} from "@/lib/projects/campos";
import {
  emptyExtraction,
  type IncubationExtraction,
  type IncubationMessage,
} from "@/lib/projects/incubation/schema";
import type { IncubationReadiness } from "@/lib/projects/incubation/readiness";
import { evaluateReadiness } from "@/lib/projects/incubation/readiness";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, FlaskConicalIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

function mergeExtractionLocal(
  current: IncubationExtraction,
  patch: Partial<IncubationExtraction>,
): IncubationExtraction {
  return {
    ...current,
    ...patch,
    identidad: { ...current.identidad, ...patch.identidad },
    ecosistema: { ...current.ecosistema, ...patch.ecosistema },
    ejecucion: { ...current.ejecucion, ...patch.ejecucion },
    completitud: { ...current.completitud, ...patch.completitud },
  };
}

export function IncubationWorkspace({ className }: { className?: string }) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IncubationMessage[]>([]);
  const [extraction, setExtraction] = useState<IncubationExtraction>(emptyExtraction());
  const [readiness, setReadiness] = useState<IncubationReadiness>(() =>
    evaluateReadiness(emptyExtraction()),
  );
  const [campos, setCampos] = useState<CampoInfo[]>([getDefaultCampo()]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);

  const loadCampos = useCallback(async () => {
    try {
      const response = await fetch("/api/proyectos", { cache: "no-store" });
      if (!response.ok) return;
      const data: { campos?: CampoInfo[] } = await response.json();
      if (data.campos?.length) setCampos(data.campos);
    } catch {
      // default local
    }
  }, []);

  useEffect(() => {
    void loadCampos();
  }, [loadCampos]);

  useEffect(() => {
    void (async () => {
      setIsBootstrapping(true);
      try {
        const response = await fetch("/api/proyectos/incubation/sessions", {
          method: "POST",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo iniciar la incubación.");
        }
        setSessionId(data.session.id);
        setMessages(data.session.messages ?? []);
        const state = data.session.extractionState ?? emptyExtraction();
        if (!state.campoSlug) {
          state.campoSlug = DEFAULT_CAMPO_SLUG;
        }
        setExtraction(state);
        setReadiness(evaluateReadiness(state));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Error al iniciar incubación.",
        );
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, []);

  const handleSend = async (message: string) => {
    if (!sessionId || isSending) return;

    const optimisticUser: IncubationMessage = {
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setIsSending(true);

    try {
      const response = await fetch(
        `/api/proyectos/incubation/sessions/${sessionId}/turn`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo enviar el mensaje.");
      }

      setMessages(data.session.messages);
      const state = data.extractionState ?? data.session.extractionState;
      setExtraction(state);
      setReadiness(data.readiness ?? evaluateReadiness(state));
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m !== optimisticUser));
      toast.error(
        error instanceof Error ? error.message : "Error en el turno de incubación.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleExtractionChange = (patch: Partial<IncubationExtraction>) => {
    setExtraction((current) => {
      const next = mergeExtractionLocal(current, patch);
      setReadiness(evaluateReadiness(next));
      return next;
    });
  };

  const handleConsolidate = async () => {
    if (!sessionId || !readiness.isReady || isConsolidating) return;

    setIsConsolidating(true);
    try {
      const response = await fetch(
        `/api/proyectos/incubation/sessions/${sessionId}/consolidate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extractionOverrides: extraction }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo consolidar el proyecto.");
      }

      toast.success(`Proyecto consolidado: ${data.project.title}`, {
        description: "Markdown escrito en el Atanor e ingesta al grafo iniciada.",
      });
      router.push("/proyectos");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al consolidar.",
      );
    } finally {
      setIsConsolidating(false);
    }
  };

  if (isBootstrapping) {
    return (
      <div className="flex flex-1 items-center justify-center font-mono text-[10px] text-muted-foreground">
        <Loader2Icon className="mr-2 size-4 animate-spin" />
        Iniciando incubador…
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/proyectos"
            aria-label="Volver a proyectos"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <ArrowLeftIcon />
          </Link>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <FlaskConicalIcon className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              Atanor · Incubación
            </p>
            <h1 className="truncate text-sm font-semibold">
              Incubador Conversacional
            </h1>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <IncubationChatPanel
          messages={messages}
          isSending={isSending}
          disabled={!sessionId}
          onSend={(msg) => void handleSend(msg)}
          className="min-h-[50vh] flex-1 lg:min-h-0"
        />
        <IncubationHitlPanel
          extraction={extraction}
          readiness={readiness}
          campos={campos}
          isConsolidating={isConsolidating}
          onChange={handleExtractionChange}
          onConsolidate={() => void handleConsolidate()}
        />
      </div>
    </div>
  );
}
