"use client";

import type { ArcanaTradicion, PaginaMago22, TipoLetraHebrea } from "@/lib/mago/types";
import { cn } from "@/lib/utils";

const TIPO_LABEL: Record<TipoLetraHebrea, string> = {
  madre: "Madre",
  doble: "Doble",
  simple: "Simple",
};

const TIPO_TONE: Record<TipoLetraHebrea, string> = {
  madre: "border-destructive/30 bg-destructive/10 text-destructive",
  doble: "border-accent/30 bg-accent/10 text-accent",
  simple: "border-border bg-muted/40 text-muted-foreground",
};

type MagoLevelCardProps = {
  page: PaginaMago22;
  selected?: boolean;
  onSelect?: () => void;
  emphasizeTradition?: boolean;
};

export function MagoLevelCard({
  page,
  selected,
  onSelect,
  emphasizeTradition = true,
}: MagoLevelCardProps) {
  const { core } = page;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "castillo-card flex w-full flex-col gap-3 border p-4 text-left transition-colors",
        selected
          ? "border-accent/40 bg-accent/5"
          : "border-border hover:border-border",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Nivel {core.id}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">{core.letra}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{core.significado}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
            TIPO_TONE[core.tipo],
          )}
        >
          {TIPO_LABEL[core.tipo]}
        </span>
      </header>

      <p className="font-mono text-[11px] text-accent/80">
        Tarot · {core.tarot}
      </p>

      {emphasizeTradition && page.tradicion ? (
        <TradicionBlock tradicion={page.tradicion} />
      ) : null}

      <div className="space-y-1.5 border-t border-border pt-3">
        {page.proyectoAsociado ? (
          <DimRow
            label="Proyecto"
            value={`${page.proyectoAsociado.nombre}${
              page.proyectoAsociado.friccion
                ? ` · fricción ${page.proyectoAsociado.friccion}`
                : ""
            }`}
          />
        ) : null}
        {page.libroRojo ? (
          <DimRow label="Libro Rojo" value={page.libroRojo.titulo} />
        ) : null}
        {page.capituloLibro ? (
          <DimRow
            label="Capítulo"
            value={`${page.capituloLibro.numero}. ${page.capituloLibro.titulo}`}
          />
        ) : null}
        {page.otrasDimensiones.map((dim) => (
          <DimRow
            key={`${dim.nombreColeccion}-${dim.tituloElemento}`}
            label={dim.nombreColeccion}
            value={dim.tituloElemento}
          />
        ))}
        {!page.proyectoAsociado &&
        !page.libroRojo &&
        !page.capituloLibro &&
        page.otrasDimensiones.length === 0 ? (
          <p className="font-mono text-[10px] text-muted-foreground">Sin dimensiones</p>
        ) : null}
      </div>
    </button>
  );
}

function TradicionBlock({ tradicion }: { tradicion: ArcanaTradicion }) {
  if (tradicion.tipo === "madre") {
    const { madre } = tradicion;
    return (
      <div className="space-y-1 rounded-md border border-destructive/15 bg-destructive/5 p-2.5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-destructive/60">
          Alquimia · 3 Madres
        </p>
        <DimRow label="Principio" value={madre.alquimia} />
        <DimRow label="Metal" value={madre.metal} />
        <DimRow label="Género" value={madre.genero} />
        <DimRow label="Atributo" value={madre.atributoAlquimico} />
      </div>
    );
  }

  if (tradicion.tipo === "doble") {
    const { doble } = tradicion;
    return (
      <div className="space-y-1 rounded-md border border-accent/15 bg-accent/5 p-2.5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent/60">
          V.I.T.R.I.O.L. · 7 Dobles
        </p>
        <DimRow label="Sephirot" value={doble.sephirot} />
        <DimRow label="Hermetismo" value={doble.hermetismo} />
        <DimRow label="Chakra" value={`${doble.chakra} (${doble.mantra})`} />
        <DimRow label="Elemento" value={doble.elementoMetalPlaneta} />
        <DimRow label="Cuerpo" value={doble.cuerpoVitriol} />
        <DimRow label="Emoción" value={doble.emocion} />
        {doble.desbalance !== "—" ? (
          <DimRow label="Desbalance" value={doble.desbalance} />
        ) : null}
      </div>
    );
  }

  const { simple } = tradicion;
  return (
    <div className="space-y-1 rounded-md border border-border bg-muted/40 p-2.5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Gran Obra · 12 Simples
      </p>
      <DimRow label="Astrología" value={simple.astrologia} />
      <DimRow label="Fisiología" value={simple.accionFisiologica} />
      <DimRow label="Cuerpo" value={simple.parteCuerpo} />
      <DimRow label="Proceso" value={simple.procesoQuimico} />
      {simple.etapaAlquimica !== "—" ? (
        <DimRow label="Boda alquímica" value={simple.etapaAlquimica} />
      ) : null}
    </div>
  );
}

function DimRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
  );
}
