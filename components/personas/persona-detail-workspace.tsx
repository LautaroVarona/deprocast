"use client";

import { ActivityFeed } from "@/components/personas/activity-feed";
import { PersonaRelationsSheet } from "@/components/personas/persona-relations-sheet";
import { PersonaFormSheet } from "@/components/personas/persona-form-sheet";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Persona } from "@/lib/personas/model";
import type { PersonaRelationListItem } from "@/lib/personas/model";
import type { PersonaDetailDto } from "@/lib/personas/types";
import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  CircleDotIcon,
  LinkIcon,
  Loader2Icon,
  PencilIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type PersonaDetailWorkspaceProps = {
  idOrSlug: string;
};

const KIND_LABELS: Record<string, string> = {
  fisica: "Persona física",
  juridica: "Persona jurídica",
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PersonaDetailWorkspace({ idOrSlug }: PersonaDetailWorkspaceProps) {
  const router = useRouter();
  const [persona, setPersona] = useState<PersonaDetailDto | null>(null);
  const [entity, setEntity] = useState<Persona | null>(null);
  const [relations, setRelations] = useState<PersonaRelationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRelations, setShowRelations] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPersona = useCallback(async () => {
    setIsLoading(true);
    setNotFound(false);
    try {
      const response = await fetch(`/api/personas/${encodeURIComponent(idOrSlug)}`, {
        cache: "no-store",
      });
      if (response.status === 404) {
        setNotFound(true);
        setPersona(null);
        setEntity(null);
        return;
      }
      if (!response.ok) return;
      const data: {
        persona: PersonaDetailDto;
        entity: Persona;
        relations: PersonaRelationListItem[];
      } = await response.json();
      setPersona(data.persona);
      setEntity(data.entity);
      setRelations(data.relations ?? []);
    } catch {
      setPersona(null);
      setEntity(null);
    } finally {
      setIsLoading(false);
    }
  }, [idOrSlug]);

  useEffect(() => {
    void loadPersona();
  }, [loadPersona]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center gap-2 font-mono text-[10px] text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Cargando ficha de contexto…
      </div>
    );
  }

  if (notFound || !persona) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>Persona no encontrada en el grafo.</p>
        <Link
          href="/personas"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <ArrowLeftIcon />
          Volver al CRM
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-start gap-3">
          <Link
            href="/personas"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "mt-0.5 shrink-0",
            )}
          >
            <ArrowLeftIcon />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <UserRoundIcon className="size-4 text-emerald-500" aria-hidden />
              <h1 className="truncate text-base font-semibold">
                {persona.primaryName}
              </h1>
              {persona.personaKind && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  {KIND_LABELS[persona.personaKind]}
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {persona.role && <span>{persona.role}</span>}
              {persona.aliases.length > 0 && (
                <span className="font-mono text-[10px]">
                  alias: {persona.aliases.join(", ")}
                </span>
              )}
              <span className="font-mono text-[10px]">
                última mención · {formatWhen(persona.lastMentionAt)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEdit(true)}
            >
              <PencilIcon />
              Editar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRelations(true)}
            >
              <LinkIcon />
              Vincular
            </Button>
            <Link
              href="/personas?tab=grafo"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0",
              )}
            >
              <LinkIcon />
              Ver grafo
            </Link>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-border lg:w-[340px] lg:border-r lg:border-b-0">
          <div className="border-b border-border px-4 py-2.5">
            <h2 className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Panel ejecutivo
            </h2>
          </div>
          <div className="max-h-[40vh] space-y-4 overflow-y-auto p-4 lg:max-h-none">
            {entity?.notasGenerales && (
              <section className="rounded-lg border border-border bg-muted/20 p-3">
                <h3 className="mb-1 text-xs font-semibold">Notas generales</h3>
                <p className="text-xs whitespace-pre-wrap text-muted-foreground">
                  {entity.notasGenerales}
                </p>
              </section>
            )}

            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold">
                  Vínculos ({relations.length})
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowRelations(true)}
                >
                  <LinkIcon />
                  Añadir
                </Button>
              </div>
              {relations.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sin relaciones en el grafo.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {relations.map((rel) => (
                    <li
                      key={rel.id}
                      className="flex items-start gap-2 rounded-md border border-border px-2.5 py-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {rel.kind}
                          </Badge>
                          <span className="font-medium">{rel.label}</span>
                        </div>
                        <p className="mt-0.5 text-muted-foreground">
                          {rel.rolPrincipal ?? rel.relationType}
                          {rel.contexto ? ` · ${rel.contexto}` : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={async () => {
                          await fetch(
                            `/api/personas/relations/${encodeURIComponent(rel.id)}`,
                            { method: "DELETE" },
                          );
                          void loadPersona();
                        }}
                      >
                        <Trash2Icon />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold">
                Bucles abiertos ({persona.openLoops.length})
              </h3>
              {persona.openLoops.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sin frentes activos detectados en el grafo.
                </p>
              ) : (
                <ul className="space-y-2">
                  {persona.openLoops.map((project) => (
                    <li
                      key={project.nodeId}
                      className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <CircleDotIcon
                          className="mt-0.5 size-3.5 shrink-0 text-amber-500"
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{project.title}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {project.relationType}
                            {project.estado ? ` · ${project.estado}` : ""}
                            {typeof project.avancePorcentaje === "number"
                              ? ` · ${project.avancePorcentaje}%`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold">
                Todos los proyectos ({persona.projects.length})
              </h3>
              {persona.projects.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sin aristas hacia proyectos en KgEdge.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {persona.projects.map((project) => (
                    <li
                      key={project.nodeId}
                      className={cn(
                        "rounded-md border border-border px-2.5 py-2 text-xs",
                        project.isOpen && "border-emerald-500/20",
                      )}
                    >
                      <p className="font-medium">{project.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-muted-foreground">
                        {project.context}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-border bg-muted/20 p-3 font-mono text-[10px] text-muted-foreground">
              <p>{persona.mentionCount} menciones indexadas</p>
              <p>confianza {Math.round(persona.confidence * 100)}%</p>
            </section>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full"
              disabled={isDeleting}
              onClick={async () => {
                if (!entity) return;
                if (!window.confirm(`¿Eliminar a ${entity.nombrePrincipal}? Se borrarán sus aristas y menciones.`)) {
                  return;
                }
                setIsDeleting(true);
                try {
                  const response = await fetch(
                    `/api/personas/${encodeURIComponent(entity.id)}`,
                    { method: "DELETE" },
                  );
                  if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error ?? "No se pudo eliminar.");
                  }
                  toast.success("Persona eliminada del grafo.");
                  router.push("/personas");
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Error al eliminar.",
                  );
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <Trash2Icon />
              )}
              Eliminar persona
            </Button>
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-border px-4 py-2.5 sm:px-6">
            <h2 className="text-xs font-semibold">Muro de actividad</h2>
            <p className="font-mono text-[10px] text-muted-foreground">
              Timeline unificado · diario, chat, transcripciones y NER
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <ActivityFeed items={persona.activity} />
          </div>
        </section>
      </div>

      {entity && (
        <>
          <PersonaFormSheet
            open={showEdit}
            onOpenChange={setShowEdit}
            initialPersona={entity}
            onSaved={() => void loadPersona()}
          />
          <PersonaRelationsSheet
            open={showRelations}
            source={{ id: entity.id, nombrePrincipal: entity.nombrePrincipal }}
            onOpenChange={setShowRelations}
            onCreated={() => void loadPersona()}
          />
        </>
      )}
    </div>
  );
}
