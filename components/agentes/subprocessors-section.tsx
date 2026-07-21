"use client";

import { PathTooltip } from "@/components/agentes/path-tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KG_INGEST_SOURCES, SUBPROCESSORS } from "@/lib/agentes/catalog";
import { CpuIcon, DatabaseIcon } from "lucide-react";

export function SubprocessorsSection() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <CpuIcon className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Subprocesadores y fuentes KG
        </h2>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Estación</TableHead>
              <TableHead className="text-muted-foreground">Componente</TableHead>
              <TableHead className="hidden text-muted-foreground md:table-cell">
                Función
              </TableHead>
              <TableHead className="text-muted-foreground">Ubicación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SUBPROCESSORS.map((item) => (
              <TableRow
                key={item.id}
                className="border-border hover:bg-muted/30"
              >
                <TableCell className="font-mono text-xs text-primary/90">
                  {item.station}
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {item.name}
                </TableCell>
                <TableCell className="hidden max-w-xs text-xs text-muted-foreground md:table-cell">
                  {item.description}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <PathTooltip path={item.location} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-2">
        <DatabaseIcon className="size-4 text-muted-foreground" aria-hidden />
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Ingesta automática del Grafo
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {KG_INGEST_SOURCES.map((source) => (
          <div
            key={source.id}
            className="rounded-lg border border-border bg-background/50 p-3"
          >
            <p className="text-sm font-medium text-foreground">{source.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {source.description}
            </p>
            <div className="mt-2 space-y-1">
              {source.locations.map((loc) => (
                <PathTooltip key={loc} path={loc} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
