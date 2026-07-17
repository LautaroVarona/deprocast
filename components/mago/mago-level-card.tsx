"use client";

import type { ArcanaTradicion, PaginaMago22, TipoLetraHebrea } from "@/lib/mago/types";
import { cn } from "@/lib/utils";

const TIPO_LABEL: Record<TipoLetraHebrea, string> = {
  madre: "Madre",
  doble: "Doble",
  simple: "Simple",
};

const TIPO_TONE: Record<TipoLetraHebrea, string> = {
  madre: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  doble: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  simple: "border-white/15 bg-white/5 text-white/70",
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
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-white/10 hover:border-white/20",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
            Nivel {core.id}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-white">{core.letra}</h3>
          <p className="mt-0.5 text-xs text-white/50">{core.significado}</p>
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

      <p className="font-mono text-[11px] text-amber-200/80">
        Tarot · {core.tarot}
      </p>

      {emphasizeTradition && page.tradicion ? (
        <TradicionBlock tradicion={page.tradicion} />
      ) : null}

      <div className="space-y-1.5 border-t border-white/10 pt-3">
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
          <p className="font-mono text-[10px] text-white/25">Sin dimensiones</p>
        ) : null}
      </div>
    </button>
  );
}

function TradicionBlock({ tradicion }: { tradicion: ArcanaTradicion }) {
  if (tradicion.tipo === "madre") {
    const { madre } = tradicion;
    return (
      <div className="space-y-1 rounded-md border border-rose-500/15 bg-rose-500/5 p-2.5">
        <p className="font-mono text-[9px] uppercase tracking-wider text-rose-300/60">
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
      <div className="space-y-1 rounded-md border border-amber-500/15 bg-amber-500/5 p-2.5">
        <p className="font-mono text-[9px] uppercase tracking-wider text-amber-300/60">
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
    <div className="space-y-1 rounded-md border border-white/10 bg-white/5 p-2.5">
      <p className="font-mono text-[9px] uppercase tracking-wider text-white/40">
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
      <span className="font-mono text-[9px] uppercase tracking-wider text-white/30">
        {label}
      </span>
      <span className="text-xs text-white/75">{value}</span>
    </div>
  );
}
