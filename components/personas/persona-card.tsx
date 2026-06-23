"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PersonaCardDto } from "@/lib/personas/types";
import { cn } from "@/lib/utils";
import { ClockIcon, LinkIcon, PencilIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";

type PersonaCardProps = {
  persona: PersonaCardDto;
  onLink?: () => void;
  onEdit?: () => void;
};

function formatRelative(iso: string | null): string {
  if (!iso) return "Sin menciones";
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

const KIND_LABELS: Record<string, string> = {
  fisica: "Física",
  juridica: "Jurídica",
};

export function PersonaCard({ persona, onLink, onEdit }: PersonaCardProps) {
  const hasRecentActivity = persona.lastMentionAt !== null;

  return (
    <Card
      className={cn(
        "h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.12)]",
        hasRecentActivity && "border-emerald-500/20",
      )}
    >
      <CardHeader className="gap-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/personas/${persona.slug}`} className="min-w-0 flex-1">
            <CardTitle className="line-clamp-1 text-sm leading-snug hover:text-primary">
              {persona.primaryName}
            </CardTitle>
          </Link>
          <div className="flex shrink-0 gap-0.5">
            {onLink && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onLink}
                aria-label="Vincular"
              >
                <LinkIcon />
              </Button>
            )}
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onEdit}
                aria-label="Editar"
              >
                <PencilIcon />
              </Button>
            )}
            <UserRoundIcon
              className="mt-1 size-4 shrink-0 text-emerald-500/80"
              aria-hidden
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {persona.role && (
            <Badge variant="secondary" className="font-mono text-[10px]">
              {persona.role}
            </Badge>
          )}
          {persona.personaKind && (
            <Badge variant="outline" className="font-mono text-[10px]">
              {KIND_LABELS[persona.personaKind] ?? persona.personaKind}
            </Badge>
          )}
          {persona.aliases.length > 0 && (
            <Badge variant="ghost" className="font-mono text-[10px]">
              +{persona.aliases.length} alias
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ClockIcon className="size-3.5 shrink-0" aria-hidden />
          <span>{formatRelative(persona.lastMentionAt)}</span>
          {persona.mentionCount > 0 && (
            <span className="ml-auto font-mono tabular-nums">
              {persona.mentionCount} menc.
            </span>
          )}
        </div>

        {persona.projects.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {persona.projects.map((project) => (
              <Badge
                key={project.id}
                variant="outline"
                className="max-w-full truncate border-emerald-500/30 bg-emerald-500/5 text-[10px] text-emerald-700 dark:text-emerald-300"
              >
                {project.title}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Sin proyectos activos vinculados</p>
        )}
      </CardContent>
    </Card>
  );
}
