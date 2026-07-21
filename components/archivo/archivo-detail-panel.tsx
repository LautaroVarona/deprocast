"use client";

import {
  ARCHIVO_KIND_LABELS,
  type ArchivoItemDetail,
} from "@/lib/archivo/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExternalLinkIcon, FileTextIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";

type ArchivoDetailPanelProps = {
  detail: ArchivoItemDetail | null;
  isLoading: boolean;
  formatDate: (iso: string) => string;
};

export function ArchivoDetailPanel({
  detail,
  isLoading,
  formatDate,
}: ArchivoDetailPanelProps) {
  return (
    <section className="archivo-noir-panel flex min-h-[24rem] flex-col p-4 sm:p-5">
      <header className="mb-4 flex items-center gap-2 border-b border-border pb-3">
        <FileTextIcon className="size-4 text-primary/70" />
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Contenido en bruto
        </p>
      </header>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Cargando documento…
        </div>
      ) : !detail ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center font-mono text-xs text-muted-foreground">
          Seleccioná un documento para ver su contenido completo, fechas y tag
          dominante.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="space-y-2">
            <h2 className="font-mono text-lg text-muted-foreground">{detail.title}</h2>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
              <span className="rounded border border-border px-1.5 py-0.5">
                {ARCHIVO_KIND_LABELS[detail.kind]}
              </span>
              <span>{formatDate(detail.createdAt)}</span>
              {detail.updatedAt ? (
                <span>· act. {formatDate(detail.updatedAt)}</span>
              ) : null}
              <span>· {detail.charCount.toLocaleString("es-AR")} chars</span>
            </div>

            {detail.strongestTag ? (
              <div className="rounded-md border border-accent/20 bg-accent/5 px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-accent/60">
                  Tag más fuerte
                </p>
                <p className="font-mono text-sm text-accent/90">
                  #{detail.strongestTag.label}
                  <span className="ml-2 text-accent/50">
                    peso {detail.strongestTag.weight}
                  </span>
                </p>
              </div>
            ) : null}

            {detail.deepLink ? (
              <Link
                href={detail.deepLink}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "gap-1.5 border-border bg-transparent font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-muted-foreground",
                )}
              >
                <ExternalLinkIcon className="size-3.5" />
                Ir al módulo origen
              </Link>
            ) : null}
          </div>

          <pre
            className={cn(
              "min-h-0 flex-1 overflow-auto rounded-md border border-border bg-foreground/40 p-4",
              "whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground",
            )}
          >
            {detail.content}
          </pre>
        </div>
      )}
    </section>
  );
}
