"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatDomainStat,
} from "@/lib/backup/browser-preferences-client";
import type { DomainPreviewStat } from "@/lib/backup/domains";
import type { ExportDomainId } from "@/lib/backup/domains";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

type ExportDomainSelectorProps = {
  stats: DomainPreviewStat[];
  selected: ExportDomainId[];
  onChange: (next: ExportDomainId[]) => void;
  disabled?: boolean;
  idPrefix?: string;
};

function groupStats(stats: DomainPreviewStat[]) {
  const groups = new Map<string, DomainPreviewStat[]>();

  for (const stat of stats) {
    const list = groups.get(stat.group) ?? [];
    list.push(stat);
    groups.set(stat.group, list);
  }

  return [...groups.entries()];
}

export function ExportDomainSelector({
  stats,
  selected,
  onChange,
  disabled = false,
  idPrefix = "export",
}: ExportDomainSelectorProps) {
  const grouped = useMemo(() => groupStats(stats), [stats]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggleDomain = (domainId: ExportDomainId) => {
    if (selectedSet.has(domainId)) {
      onChange(selected.filter((id) => id !== domainId));
      return;
    }

    onChange([...selected, domainId]);
  };

  const selectAll = () => {
    onChange(stats.map((stat) => stat.id));
  };

  const selectNone = () => {
    onChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={selectAll}
        >
          Seleccionar todo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={selectNone}
        >
          Ninguno
        </Button>
        <Badge variant="secondary" className="self-center">
          {selected.length} de {stats.length} seleccionados
        </Badge>
      </div>

      <div className="space-y-4">
        {grouped.map(([group, domains]) => (
          <div key={group} className="space-y-2">
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              {group}
            </p>
            <div className="space-y-2">
              {domains.map((domain) => {
                const inputId = `${idPrefix}-${domain.id}`;
                const isChecked = selectedSet.has(domain.id);

                return (
                  <label
                    key={domain.id}
                    htmlFor={inputId}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      isChecked
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-muted/20 hover:bg-muted/40",
                      disabled && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      className="mt-1"
                      checked={isChecked}
                      disabled={disabled}
                      onChange={() => toggleDomain(domain.id)}
                    />
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{domain.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDomainStat(
                            domain.fileCount,
                            domain.totalBytes,
                            domain.rowCount,
                            domain.clientOnly,
                          )}
                        </span>
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {domain.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ExportDomainAccordionProps = ExportDomainSelectorProps & {
  title?: string;
  description?: string;
};

export function ExportDomainAccordion({
  title = "Exportación personalizada",
  description = "Elegí qué dominios incluir en la copia. También sirve como referencia de todo lo exportable en Deprocast.",
  ...selectorProps
}: ExportDomainAccordionProps) {
  return (
    <Accordion className="rounded-lg border border-border px-4">
      <AccordionItem value="custom-export">
        <AccordionTrigger className="py-4 hover:no-underline">
          <span className="space-y-1">
            <span className="block text-sm font-medium">{title}</span>
            <span className="block text-xs font-normal text-muted-foreground">
              {description}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <ExportDomainSelector {...selectorProps} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
