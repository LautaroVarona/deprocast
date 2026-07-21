"use client";

import {
  buildHistorialExportUrl,
  type ExportFormat,
} from "@/components/historial/historial-utils";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DownloadIcon, FileJsonIcon, FileSpreadsheetIcon, FileTextIcon } from "lucide-react";

type HistorialExportMenuProps = {
  category?: string;
  agentId?: string;
  selectedDay?: string | null;
  days?: number;
  variant?: "default" | "compact";
};

const EXPORT_OPTIONS: Array<{
  format: ExportFormat;
  label: string;
  description: string;
  icon: typeof FileJsonIcon;
  accent?: boolean;
}> = [
  {
    format: "json",
    label: "JSON",
    description: "Estructurado para máquinas y pipelines",
    icon: FileJsonIcon,
  },
  {
    format: "csv",
    label: "CSV",
    description: "Tabla compacta para análisis rápido",
    icon: FileSpreadsheetIcon,
  },
  {
    format: "csv-coach",
    label: "Coach (CSV)",
    description: "Agentes, modelos e intervenciones por fila",
    icon: FileSpreadsheetIcon,
    accent: true,
  },
  {
    format: "md-coach",
    label: "Coach (Markdown)",
    description: "Legible para coaches y profesionales",
    icon: FileTextIcon,
    accent: true,
  },
];

export function HistorialExportMenu({
  category = "all",
  agentId = "all",
  selectedDay = null,
  days = 30,
  variant = "default",
}: HistorialExportMenuProps) {
  if (variant === "compact") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {EXPORT_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <a
              key={option.format}
              href={buildHistorialExportUrl(option.format, {
                category,
                agentId,
                selectedDay,
                days,
              })}
              download
              title={option.description}
              className={cn(
                buttonVariants({ variant: "outline", size: "xs" }),
                "gap-1 border-border bg-muted/40 text-foreground/80",
                option.accent && "border-primary/50 text-primary",
              )}
            >
              <Icon className="size-3" />
              {option.label}
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {EXPORT_OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <a
            key={option.format}
            href={buildHistorialExportUrl(option.format, {
              category,
              agentId,
              selectedDay,
              days,
            })}
            download
            className={cn(
              "group flex items-start gap-3 rounded-lg border p-3 transition",
              option.accent
                ? "border-primary/40 bg-primary/20 hover:border-primary/50"
                : "border-border bg-muted/40 hover:border-border",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md border",
                option.accent
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <DownloadIcon className="size-3.5 opacity-60" />
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {option.description}
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
