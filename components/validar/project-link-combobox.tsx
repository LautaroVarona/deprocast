"use client";

import { cn } from "@/lib/utils";
import type { Project } from "@/lib/projects/types";
import { CheckIcon, LinkIcon, SearchIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

type ProjectLinkComboboxProps = {
  projects: Project[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  className?: string;
};

export function ProjectLinkCombobox({
  projects,
  selectedIds,
  onChange,
  className,
}: ProjectLinkComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedProjects = useMemo(
    () => projects.filter((project) => selectedIds.includes(project.id)),
    [projects, selectedIds],
  );

  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const available = projects.filter((project) => !selectedIds.includes(project.id));

    if (!normalized) {
      return available.slice(0, 8);
    }

    return available
      .filter((project) => {
        const haystack = `${project.title} ${project.campo}`.toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 8);
  }, [projects, query, selectedIds]);

  const toggleProject = (projectId: string) => {
    if (selectedIds.includes(projectId)) {
      onChange(selectedIds.filter((id) => id !== projectId));
      return;
    }
    onChange([...selectedIds, projectId]);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          placeholder="Buscar proyecto existente…"
          className="h-7 w-full rounded border border-input bg-background pr-2 pl-7 font-mono text-[10px] outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />

        {open && filteredProjects.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded border border-border bg-popover shadow-md">
            {filteredProjects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggleProject(project.id)}
                  className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-muted"
                >
                  <span className="min-w-0 truncate font-mono text-[10px]">
                    {project.title}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {project.campo}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {open && query.trim() && filteredProjects.length === 0 && (
          <div className="absolute z-20 mt-1 w-full rounded border border-border bg-popover px-2 py-1.5 font-mono text-[10px] text-muted-foreground shadow-md">
            Sin coincidencias. Solo podés enlazar proyectos ya existentes.
          </div>
        )}
      </div>

      {selectedProjects.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => toggleProject(project.id)}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary transition-colors hover:bg-primary/15"
            >
              <LinkIcon className="size-3" />
              {project.title}
              <XIcon className="size-3" />
            </button>
          ))}
        </div>
      ) : (
        <p className="font-mono text-[10px] text-muted-foreground">
          Sin conexiones. Buscá un proyecto del Atanor para vincular este nodo.
        </p>
      )}

      {projects.length === 0 && (
        <p className="font-mono text-[10px] text-muted-foreground">
          No hay proyectos en el Atanor. Creálos desde la vista Proyectos.
        </p>
      )}

      {selectedIds.length > 0 && (
        <p className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <CheckIcon className="size-3 text-primary" />
          {selectedIds.length} proyecto{selectedIds.length === 1 ? "" : "s"} enlazado
          {selectedIds.length === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
