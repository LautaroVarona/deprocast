"use client";

import {
  formatElapsedCompact,
  formatMealTime,
  getMealRecords,
} from "@/components/salud/lib/fasting";
import {
  formatLastActivity,
  getWeeklySessionCount,
} from "@/components/salud/lib/deporte-stats";
import { useLiveFastingMs } from "@/components/salud/hooks/use-live-fasting";
import { SALUD_TABS } from "@/components/salud/constants";
import type { SaludTab } from "@/components/salud/types";
import type { HealthRecordDto } from "@/lib/events/types";
import { cn } from "@/lib/utils";
import {
  ActivityIcon,
  AppleIcon,
  HeartPulseIcon,
  PlusIcon,
  type LucideIcon,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";

type SaludHubProps = {
  records: HealthRecordDto[];
  onSelect: (tab: SaludTab) => void;
};

const TAB_ICONS: Record<SaludTab, LucideIcon> = {
  telemetria: HeartPulseIcon,
  alimentacion: AppleIcon,
  deporte: ActivityIcon,
  mas: PlusIcon,
};

const TAB_ICON_COLORS: Record<SaludTab, string> = {
  telemetria: "text-zinc-400",
  alimentacion: "text-emerald-500/80",
  deporte: "text-amber-500/80",
  mas: "text-zinc-400",
};

function ConstructionBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex w-fit rounded-full border border-zinc-700/80 bg-zinc-800/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-zinc-400">
      {label}
    </span>
  );
}

type WidgetCardProps = {
  label: string;
  icon: LucideIcon;
  iconClassName: string;
  onClick: () => void;
  children: ReactNode;
};

function WidgetCard({
  label,
  icon: Icon,
  iconClassName,
  onClick,
  children,
}: WidgetCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex h-full min-h-0 flex-col rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-left",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-700/80 hover:bg-zinc-900/70",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4 shrink-0", iconClassName)} />
        <span className="text-sm font-semibold text-zinc-100">{label}</span>
      </div>
      <div className="mt-auto flex flex-col gap-1.5 pt-6">{children}</div>
    </button>
  );
}

function AlimentacionWidgetBody({ records }: { records: HealthRecordDto[] }) {
  const elapsedMs = useLiveFastingMs(records);
  const meals = useMemo(() => getMealRecords(records), [records]);
  const lastMeal = meals[0];

  return (
    <>
      <p
        className={cn(
          "font-mono text-lg font-medium tabular-nums tracking-tight",
          elapsedMs !== null ? "text-emerald-400" : "text-zinc-500",
        )}
      >
        {elapsedMs !== null
          ? `${formatElapsedCompact(elapsedMs)} de ayuno`
          : "Sin ayuno activo"}
      </p>
      <p className="line-clamp-2 text-xs text-zinc-400">
        {lastMeal
          ? `Última ingesta: ${formatMealTime(lastMeal.occurredAt)} — ${lastMeal.summary}`
          : "Registrá tu primera ingesta"}
      </p>
    </>
  );
}

function DeporteWidgetBody({ records }: { records: HealthRecordDto[] }) {
  const rendimiento = useMemo(
    () => records.filter((record) => record.pillar === "rendimiento"),
    [records],
  );
  const lastActivity = formatLastActivity(rendimiento);
  const weeklyCount = getWeeklySessionCount(rendimiento);

  return (
    <>
      <p className="text-sm font-medium text-zinc-200">
        {lastActivity ?? "Sin actividad registrada"}
      </p>
      <p className="text-xs text-zinc-400">
        {weeklyCount > 0
          ? `${weeklyCount} sesión${weeklyCount === 1 ? "" : "es"} esta semana`
          : "Empezá a registrar entrenamientos"}
      </p>
    </>
  );
}

function WidgetBody({
  tab,
  records,
}: {
  tab: SaludTab;
  records: HealthRecordDto[];
}) {
  if (tab === "alimentacion") {
    return <AlimentacionWidgetBody records={records} />;
  }
  if (tab === "deporte") {
    return <DeporteWidgetBody records={records} />;
  }
  if (tab === "telemetria") {
    return <ConstructionBadge label="Próximamente · API de Sensores" />;
  }
  return <ConstructionBadge label="En Construcción" />;
}

export function SaludHub({ records, onSelect }: SaludHubProps) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3 p-4">
      {SALUD_TABS.map((tab) => {
        const Icon = TAB_ICONS[tab.id];
        return (
          <WidgetCard
            key={tab.id}
            label={tab.label}
            icon={Icon}
            iconClassName={TAB_ICON_COLORS[tab.id]}
            onClick={() => onSelect(tab.id)}
          >
            <WidgetBody tab={tab.id} records={records} />
          </WidgetCard>
        );
      })}
    </div>
  );
}
