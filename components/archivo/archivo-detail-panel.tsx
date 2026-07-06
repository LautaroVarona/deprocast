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
      <header className="mb-4 flex items-center gap-2 border-b border-white/8 pb-3">
        <FileTextIcon className="size-4 text-sky-400/70" />
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
          Contenido en bruto
        </p>
      </header>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 font-mono text-xs text-white/35">
          <Loader2Icon className="size-4 animate-spin" />
          Cargando documento…
        </div>
      ) : !detail ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center font-mono text-xs text-white/30">
          Seleccioná un documento para ver su contenido completo, fechas y tag
          dominante.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="space-y-2">
            <h2 className="font-mono text-lg text-white/90">{detail.title}</h2>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-white/40">
              <span className="rounded border border-white/10 px-1.5 py-0.5">
                {ARCHIVO_KIND_LABELS[detail.kind]}
              </span>
              <span>{formatDate(detail.createdAt)}</span>
              {detail.updatedAt ? (
                <span>· act. {formatDate(detail.updatedAt)}</span>
              ) : null}
              <span>· {detail.charCount.toLocaleString("es-AR")} chars</span>
            </div>

            {detail.strongestTag ? (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-amber-200/60">
                  Tag más fuerte
                </p>
                <p className="font-mono text-sm text-amber-100/90">
                  #{detail.strongestTag.label}
                  <span className="ml-2 text-amber-200/50">
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
                  "gap-1.5 border-white/15 bg-transparent font-mono text-[10px] uppercase tracking-wider text-white/55 hover:text-white/80",
                )}
              >
                <ExternalLinkIcon className="size-3.5" />
                Ir al módulo origen
              </Link>
            ) : null}
          </div>

          <pre
            className={cn(
              "min-h-0 flex-1 overflow-auto rounded-md border border-white/8 bg-black/70 p-4",
              "whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/75",
            )}
          >
            {detail.content}
          </pre>
        </div>
      )}
    </section>
  );
}
