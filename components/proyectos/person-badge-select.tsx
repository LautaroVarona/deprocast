"use client";

import { MentionBadge } from "@/components/chat/mention-badge";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";

export type SelectedPerson = {
  id: string;
  label: string;
};

type PersonSuggestion = {
  id: string;
  primaryName: string;
};

type PersonBadgeSelectProps = {
  id?: string;
  selected: SelectedPerson[];
  onChange: (people: SelectedPerson[]) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

export function PersonBadgeSelect({
  id,
  selected,
  onChange,
  disabled = false,
  compact = false,
  className,
}: PersonBadgeSelectProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PersonSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedIds = useMemo(
    () => new Set(selected.map((person) => person.id)),
    [selected],
  );

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: "12",
      });
      const response = await fetch(`/api/kg/personas?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar personas");
      }
      setSuggestions(
        (data.personas ?? []).filter(
          (person: PersonSuggestion) => !selectedIds.has(person.id),
        ),
      );
      setActiveIndex(0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedIds]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      void fetchSuggestions(query);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [query, isOpen, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addPerson = (person: SelectedPerson) => {
    if (selectedIds.has(person.id)) return;
    onChange([...selected, person]);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removePerson = (personId: string) => {
    onChange(selected.filter((person) => person.id !== personId));
  };

  const createStub = async () => {
    const name = query.trim();
    if (!name || isCreating) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/kg/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear la persona");
      }
      addPerson({
        id: data.persona.id,
        label: data.persona.primaryName,
      });
      toast.success(`Persona "${data.persona.primaryName}" creada y vinculada.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear la persona.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const trimmedQuery = query.trim();
  const showCreateOption =
    trimmedQuery.length > 0 &&
    !suggestions.some(
      (person) => person.primaryName.toLowerCase() === trimmedQuery.toLowerCase(),
    );

  const dropdownItems: Array<
    | { kind: "suggestion"; person: PersonSuggestion }
    | { kind: "create"; name: string }
  > = [
    ...suggestions.map((person) => ({ kind: "suggestion" as const, person })),
    ...(showCreateOption ? [{ kind: "create" as const, name: trimmedQuery }] : []),
  ];

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "Enter")) {
      setIsOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        dropdownItems.length === 0 ? 0 : (current + 1) % dropdownItems.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        dropdownItems.length === 0
          ? 0
          : (current - 1 + dropdownItems.length) % dropdownItems.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const item = dropdownItems[activeIndex];
      if (!item) {
        if (showCreateOption) void createStub();
        return;
      }
      if (item.kind === "create") {
        void createStub();
        return;
      }
      addPerson({ id: item.person.id, label: item.person.primaryName });
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }

    if (event.key === "Backspace" && !query && selected.length > 0) {
      removePerson(selected[selected.length - 1].id);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-0.5 rounded-md border border-input bg-background",
          compact ? "min-h-6 px-1 py-0.5" : "min-h-9 gap-1 rounded-lg px-2 py-1.5",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40",
          disabled && "opacity-60",
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((person) => (
          <MentionBadge
            key={person.id}
            label={person.label}
            entityType="persona"
            className={compact ? "h-5 text-[10px] px-1" : undefined}
            onRemove={disabled ? undefined : () => removePerson(person.id)}
          />
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? (compact ? "Persona…" : "Escribí un nombre…") : ""}
          className={cn(
            "min-w-[4rem] flex-1 bg-transparent font-mono outline-none placeholder:text-muted-foreground",
            compact ? "text-[10px] py-0" : "text-[11px]",
          )}
        />
      </div>

      {isOpen && !disabled && (
        <div className="absolute left-0 z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-2 font-mono text-[10px] text-muted-foreground">
              <Loader2Icon className="size-3 animate-spin" />
              Buscando…
            </div>
          ) : dropdownItems.length === 0 ? (
            <div className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
              {trimmedQuery ? "Sin coincidencias" : "Escribí para buscar personas"}
            </div>
          ) : (
            <ul>
              {dropdownItems.map((item, index) => {
                const isActive = index === activeIndex;
                if (item.kind === "create") {
                  return (
                    <li key={`create-${item.name}`}>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => void createStub()}
                        disabled={isCreating}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[10px]",
                          isActive ? "bg-muted" : "hover:bg-muted/70",
                        )}
                      >
                        {isCreating ? (
                          <Loader2Icon className="size-3 animate-spin" />
                        ) : (
                          <span className="text-primary">+</span>
                        )}
                        Crear &quot;{item.name}&quot;
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={item.person.id}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() =>
                        addPerson({
                          id: item.person.id,
                          label: item.person.primaryName,
                        })
                      }
                      className={cn(
                        "flex w-full px-3 py-2 text-left font-mono text-[10px]",
                        isActive ? "bg-muted" : "hover:bg-muted/70",
                      )}
                    >
                      @{item.person.primaryName}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
