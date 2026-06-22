"use client";

import { cn } from "@/lib/utils";

type PathTooltipProps = {
  path: string;
  className?: string;
  mono?: boolean;
};

export function PathTooltip({ path, className, mono = true }: PathTooltipProps) {
  return (
    <span className={cn("group/path relative inline-block max-w-full", className)}>
      <code
        className={cn(
          "block truncate rounded-md border border-zinc-700/60 bg-zinc-950/80 px-2 py-0.5 text-[0.7rem] text-cyan-200/90",
          mono && "font-mono",
        )}
        title={path}
      >
        {path}
      </code>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden max-w-xs rounded-lg border border-cyan-500/30 bg-zinc-950 px-3 py-2 text-xs leading-relaxed text-zinc-100 shadow-xl shadow-cyan-500/10 group-hover/path:block sm:max-w-sm"
      >
        {path}
      </span>
    </span>
  );
}
