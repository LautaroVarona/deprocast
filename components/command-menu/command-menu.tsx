"use client";

import {
  COMMAND_CATEGORY_LABELS,
  COMMAND_ROUTES,
  type CommandCategory,
  type CommandRoute,
  filterRoutes,
  findRouteByHotkey,
} from "@/lib/navigation/routes";
import { UniverseSelect } from "@/components/babel/universe-select";
import { cn } from "@/lib/utils";
import {
  Loader2Icon,
  SearchIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type GlobalSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  score: number;
  kind: "semantic" | "archivo" | "kg_node";
  badge: string;
};

type MenuEntry =
  | { type: "route"; route: CommandRoute }
  | { type: "search"; result: GlobalSearchResult };

type CommandMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function groupRoutes(routes: CommandRoute[]): Map<CommandCategory, CommandRoute[]> {
  const groups = new Map<CommandCategory, CommandRoute[]>();
  for (const route of routes) {
    const list = groups.get(route.category) ?? [];
    list.push(route);
    groups.set(route.category, list);
  }
  return groups;
}

const CATEGORY_ORDER: CommandCategory[] = ["nav", "ludus", "extra"];

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const filteredRoutes = useMemo(() => filterRoutes(query), [query]);
  const routeGroups = useMemo(() => groupRoutes(filteredRoutes), [filteredRoutes]);

  const showSemantic = query.trim().length >= 2;

  const entries = useMemo<MenuEntry[]>(() => {
    const list: MenuEntry[] = [];

    if (showSemantic) {
      for (const result of searchResults) {
        list.push({ type: "search", result });
      }
    }

    for (const route of filteredRoutes) {
      list.push({ type: "route", route });
    }

    return list;
  }, [filteredRoutes, searchResults, showSemantic]);

  const close = useCallback(() => {
    onOpenChange(false);
    setQuery("");
    setSearchResults([]);
    setSearchError(null);
    setActiveIndex(0);
  }, [onOpenChange]);

  const navigate = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const selectEntry = useCallback(
    (entry: MenuEntry) => {
      if (entry.type === "route") {
        navigate(entry.route.href);
        return;
      }
      navigate(entry.result.href);
    },
    [navigate],
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const response = await fetch(
          `/api/search/global?q=${encodeURIComponent(trimmed)}&limit=10`,
          { signal: controller.signal, cache: "no-store" },
        );
        const payload = (await response.json()) as {
          results?: GlobalSearchResult[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Error de búsqueda");
        }
        setSearchResults(payload.results ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSearchResults([]);
        setSearchError(
          error instanceof Error ? error.message : "No se pudo buscar",
        );
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, searchResults.length]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.querySelector('[data-universe-select-open="true"]')) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }

      if (event.altKey && !event.metaKey && !event.ctrlKey) {
        const route = findRouteByHotkey(event.key);
        if (route) {
          event.preventDefault();
          navigate(route.href);
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) =>
          entries.length === 0 ? 0 : (index + 1) % entries.length,
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) =>
          entries.length === 0
            ? 0
            : (index - 1 + entries.length) % entries.length,
        );
        return;
      }

      if (event.key === "Enter" && entries[activeIndex]) {
        event.preventDefault();
        selectEntry(entries[activeIndex]);
        return;
      }

      if (
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        /^[1-9]$/.test(event.key) &&
        isEditableTarget(event.target)
      ) {
        const index = Number(event.key) - 1;
        if (entries[index]) {
          event.preventDefault();
          selectEntry(entries[index]);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, close, entries, activeIndex, navigate, selectEntry]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector<HTMLElement>(
      `[data-menu-index="${activeIndex}"]`,
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  if (!open) return null;

  let runningIndex = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh] sm:p-6">
      <button
        type="button"
        aria-label="Cerrar menú"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={close}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className={cn(
          "relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-amber-500/20",
          "bg-background/95 shadow-2xl shadow-amber-500/10 backdrop-blur-md",
          "animate-in fade-in zoom-in-95 duration-200",
        )}
      >
        <div className="border-b border-border/80 bg-gradient-to-r from-amber-500/10 via-transparent to-violet-500/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4 shrink-0 text-amber-500" aria-hidden />
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Portal de navegación
            </p>
            <div className="ml-auto flex items-center gap-2">
              <UniverseSelect size="md" />
              <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                ESC
              </span>
            </div>
          </div>

          <div className="relative mt-3">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar en todo el corpus… (semántica + archivo + grafo)"
              className={cn(
                "h-11 w-full rounded-xl border border-input bg-background/80 pr-24 pl-10 text-sm",
                "outline-none ring-amber-500/30 focus:border-amber-500/40 focus:ring-2",
              )}
              autoComplete="off"
              spellCheck={false}
            />
            <div className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1.5">
              {isSearching ? (
                <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
              ) : (
                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  ⌘K
                </span>
              )}
            </div>
          </div>

          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
            ↑↓ navegar · Enter ir · Alt+tecla atajo · 1-9 selección rápida
          </p>
        </div>

        <div ref={listRef} className="max-h-[min(58vh,520px)] overflow-y-auto p-2">
          {showSemantic && (
            <section className="mb-3">
              <header className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">
                Búsqueda semántica
              </header>
              {searchError ? (
                <p className="px-2 py-2 text-xs text-destructive">{searchError}</p>
              ) : searchResults.length === 0 && !isSearching ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  Sin coincidencias en memoria, archivo o grafo.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {searchResults.map((result) => {
                    const index = runningIndex++;
                    return (
                      <MenuSearchRow
                        key={result.id}
                        result={result}
                        index={index}
                        active={activeIndex === index}
                        onSelect={() => navigate(result.href)}
                        onHover={() => setActiveIndex(index)}
                      />
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {CATEGORY_ORDER.map((category) => {
            const routes = routeGroups.get(category);
            if (!routes?.length) return null;

            return (
              <section key={category} className="mb-2">
                <header className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {COMMAND_CATEGORY_LABELS[category]}
                </header>
                <ul className="space-y-0.5">
                  {routes.map((route) => {
                    const index = runningIndex++;
                    return (
                      <MenuRouteRow
                        key={route.id}
                        route={route}
                        index={index}
                        active={activeIndex === index}
                        onSelect={() => navigate(route.href)}
                        onHover={() => setActiveIndex(index)}
                      />
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {entries.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Ninguna ruta coincide con tu búsqueda.
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-border/80 bg-muted/30 px-4 py-2">
          <p className="font-mono text-[10px] text-muted-foreground">
            {entries.length} opciones · {COMMAND_ROUTES.length} rutas
          </p>
          <button
            type="button"
            onClick={close}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-3.5" />
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}

function HotkeyBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
      {label}
    </span>
  );
}

function MenuRouteRow({
  route,
  index,
  active,
  onSelect,
  onHover,
}: {
  route: CommandRoute;
  index: number;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const Icon = route.icon;
  const quickIndex = index < 9 ? String(index + 1) : null;

  return (
    <li>
      <button
        type="button"
        data-menu-index={index}
        onClick={onSelect}
        onMouseEnter={onHover}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
          active
            ? "bg-amber-500/15 text-foreground ring-1 ring-amber-500/25"
            : "hover:bg-muted/70",
        )}
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            active ? "bg-amber-500/20 text-amber-700 dark:text-amber-200" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{route.label}</span>
          {route.description ? (
            <span className="block truncate text-xs text-muted-foreground">
              {route.description}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {quickIndex ? <HotkeyBadge label={quickIndex} /> : null}
          <HotkeyBadge label={`Alt+${route.hotkey}`} />
        </span>
      </button>
    </li>
  );
}

function MenuSearchRow({
  result,
  index,
  active,
  onSelect,
  onHover,
}: {
  result: GlobalSearchResult;
  index: number;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        data-menu-index={index}
        onClick={onSelect}
        onMouseEnter={onHover}
        className={cn(
          "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
          active
            ? "bg-violet-500/15 text-foreground ring-1 ring-violet-500/25"
            : "hover:bg-muted/70",
        )}
      >
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-700 dark:text-violet-200">
          <SearchIcon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{result.title}</span>
            <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-violet-700 dark:text-violet-200">
              {result.badge}
            </span>
          </span>
          <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {result.subtitle}
          </span>
        </span>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {Math.round(result.score)}
        </span>
      </button>
    </li>
  );
}

export function useCommandMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
          if (isEditableTarget(event.target)) return;
          event.preventDefault();
          setOpen(true);
        }
        return;
      }

      if (open) return;

      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      setOpen(true);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  return { open, setOpen };
}
