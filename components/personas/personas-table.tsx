"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PersonaCardDto } from "@/lib/personas/types";
import { LinkIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PersonasTableProps = {
  personas: PersonaCardDto[];
  onLink: (persona: PersonaCardDto) => void;
  onEdit: (persona: PersonaCardDto) => void;
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

export function PersonasTable({ personas, onLink, onEdit }: PersonasTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead className="hidden md:table-cell">Aliases</TableHead>
            <TableHead className="hidden lg:table-cell">Proyectos</TableHead>
            <TableHead>Última mención</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {personas.map((persona) => (
            <TableRow key={persona.id}>
              <TableCell>
                <Link
                  href={`/personas/${persona.slug}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {persona.primaryName}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {persona.role ?? "—"}
              </TableCell>
              <TableCell className="hidden max-w-[180px] truncate md:table-cell">
                {persona.aliases.length > 0 ? persona.aliases.join(", ") : "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex flex-wrap gap-1">
                  {persona.projects.length > 0 ? (
                    persona.projects.slice(0, 2).map((project) => (
                      <Badge
                        key={project.id}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {project.title}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-mono text-[10px] text-muted-foreground">
                {formatRelative(persona.lastMentionAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onLink(persona)}
                    aria-label={`Vincular ${persona.primaryName}`}
                  >
                    <LinkIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(persona)}
                    aria-label={`Editar ${persona.primaryName}`}
                  >
                    <PencilIcon />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
