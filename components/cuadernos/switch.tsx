"use client";

import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  label?: string;
  className?: string;
};

export function Switch({
  checked,
  onCheckedChange,
  id,
  label,
  className,
}: SwitchProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 select-none",
        className,
      )}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
          checked
            ? "border-zinc-400 bg-zinc-200"
            : "border-zinc-700 bg-zinc-900",
        )}
      >
        <span
          className={cn(
            "pointer-events-none block size-3.5 rounded-full bg-zinc-950 transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </button>
      {label ? (
        <span className="font-mono text-[10px] tracking-widest text-zinc-400 uppercase">
          {label}
        </span>
      ) : null}
    </label>
  );
}
