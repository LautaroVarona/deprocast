"use client";

import { AgentCard } from "@/components/agentes/agent-card";
import { IncubationLab } from "@/components/agentes/incubation-lab";
import { SubprocessorsSection } from "@/components/agentes/subprocessors-section";
import {
  ECOSYSTEM_STATS,
  OPERATIONAL_AGENTS,
} from "@/lib/agentes/catalog";
import { ActivityIcon, BotIcon, FileTextIcon } from "lucide-react";
import Link from "next/link";

export function AgentesWorkspace() {
  return (
    <div className="min-h-full bg-slate-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-slate-950 to-slate-950" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6">
        <header className="space-y-4 border-b border-zinc-800/80 pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
              <BotIcon className="size-3.5" />
              Ecosistema cognitivo
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-500">
              <FileTextIcon className="size-3.5" />
              Fuente: {ECOSYSTEM_STATS.docSource}
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
              Mapa de Agentes
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500">
              Monitor interactivo del exoesqueleto cognitivo local-first.
              Proveedor LLM unificado:{" "}
              <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-cyan-300/90">
                {ECOSYSTEM_STATS.llmProvider}
              </code>{" "}
              vía{" "}
              <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-400">
                lib/vertex-gemini/client.ts
              </code>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <StatPill
              label="Operativos"
              value={ECOSYSTEM_STATS.operationalCount}
              tone="emerald"
            />
            <StatPill
              label="Subprocesadores"
              value={ECOSYSTEM_STATS.subprocessorsCount}
              tone="zinc"
            />
            <StatPill
              label="Fuentes KG"
              value={ECOSYSTEM_STATS.kgSourcesCount}
              tone="cyan"
            />
            <StatPill
              label="En diseño"
              value={ECOSYSTEM_STATS.designCount}
              tone="violet"
            />
          </div>
        </header>

        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <ActivityIcon className="size-4 text-emerald-400/80" aria-hidden />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Agentes operativos
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {OPERATIONAL_AGENTS.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>

        <SubprocessorsSection />

        <IncubationLab />

        <footer className="border-t border-zinc-800/60 pt-6 text-center text-xs text-zinc-600">
          Rutas UI relacionadas:{" "}
          {[
            ["/chat", "Chat"],
            ["/ingesta", "Ingesta"],
            ["/validar", "Validar"],
            ["/grafo", "Grafo"],
            ["/calibrador", "Calibrador"],
            ["/diario", "Diario"],
          ].map(([href, label], index, arr) => (
            <span key={href}>
              <Link
                href={href}
                className="text-cyan-500/70 hover:text-cyan-400 hover:underline"
              >
                {label}
              </Link>
              {index < arr.length - 1 ? " · " : null}
            </span>
          ))}
        </footer>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "cyan" | "violet" | "zinc";
}) {
  const tones = {
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
    cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
    violet: "border-violet-500/30 bg-violet-500/5 text-violet-300",
    zinc: "border-zinc-700 bg-zinc-900/50 text-zinc-400",
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${tones[tone]}`}
    >
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-xs uppercase tracking-wider opacity-80">{label}</span>
    </div>
  );
}
