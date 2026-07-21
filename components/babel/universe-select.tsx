"use client";

import { useBabel } from "@/components/babel/babel-context";
import { ROOT_UNIVERSE_SLUG } from "@/lib/babel/constants";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  ChevronDownIcon,
  Loader2Icon,
  PlusIcon,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

type UniverseSelectProps = {
  className?: string;
  size?: "sm" | "md";
  showDiscover?: boolean;
  onSwitched?: () => void;
};

export function UniverseSelect({
  className,
  size = "sm",
  showDiscover = true,
  onSwitched,
}: UniverseSelectProps) {
  const {
    universes,
    activeUniverse,
    isLoading,
    switchUniverse,
    discoverUniverse,
  } = useBabel();

  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const label = activeUniverse?.label ?? "Babel";
  const isFiltered =
    activeUniverse && activeUniverse.slug !== ROOT_UNIVERSE_SLUG;

  const handleSelect = useCallback(
    (slug: string) => {
      switchUniverse(slug);
      setOpen(false);
      onSwitched?.();
    },
    [switchUniverse, onSwitched],
  );

  const handleDiscover = async () => {
    const name = window.prompt("Nombre del nuevo Universo:");
    if (!name?.trim()) return;

    setIsCreating(true);
    try {
      await discoverUniverse(name.trim());
      toast.success(`Universo "${name.trim()}" descubierto.`);
      setOpen(false);
      onSwitched?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear el universo.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  if (isLoading && universes.length === 0) {
    return (
      <div className={cn("inline-flex items-center", className)}>
        <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      data-universe-select-open={open ? "true" : undefined}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex max-w-[min(100%,14rem)] items-center gap-1.5 rounded-full border transition-colors",
          size === "sm"
            ? "px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]"
            : "px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em]",
          isFiltered
            ? "border-primary/25 bg-primary/10 text-foreground hover:bg-primary/15"
            : "border-violet-500/25 bg-violet-500/10 text-violet-800 hover:bg-violet-500/15 dark:text-violet-100",
        )}
      >
        <span className="truncate">{label}</span>
        {isFiltered ? (
          <span className="shrink-0 opacity-60">·filtrado</span>
        ) : null}
        <ChevronDownIcon
          className={cn(
            "size-3 shrink-0 opacity-70 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Universos conocidos"
          className={cn(
            "absolute top-[calc(100%+6px)] right-0 z-[110] min-w-[12rem] overflow-hidden rounded-xl border border-border bg-popover shadow-lg",
            "animate-in fade-in zoom-in-95 duration-150",
          )}
        >
          <ul className="max-h-64 overflow-y-auto p-1">
            {universes.map((universe) => {
              const isActive = activeUniverse?.slug === universe.slug;
              return (
                <li key={universe.slug}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(universe.slug)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                      isActive
                        ? universe.isRoot
                          ? "bg-violet-500/15 text-violet-800 dark:text-violet-100"
                          : "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{universe.label}</span>
                    {universe.trenchesWeight !== null ? (
                      <span className="shrink-0 opacity-60">
                        ·{universe.trenchesWeight}
                      </span>
                    ) : null}
                    {isActive ? (
                      <CheckIcon className="size-3 shrink-0 opacity-80" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          {showDiscover ? (
            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={() => void handleDiscover()}
                disabled={isCreating}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {isCreating ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <PlusIcon className="size-3.5" />
                )}
                Descubrir universo
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
