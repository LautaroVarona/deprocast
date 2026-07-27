"use client";

import { MentionBadge } from "@/components/chat/mention-badge";
import { MentionDropdown } from "@/components/chat/mention-dropdown";
import {
  inputClassName,
} from "@/components/proyectos/form-controls";
import {
  detectMentionQueryWithPrefix,
  stripMentionQuery,
} from "@/lib/chat/format";
import type { ChatEntityType, MentionSuggestion } from "@/lib/chat/types";
import type { IdeateMention } from "@/lib/projects/ideate/schema";
import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

type IngestaAnchorInputProps = {
  mentions: IdeateMention[];
  onChange: (mentions: IdeateMention[]) => void;
  disabled?: boolean;
  className?: string;
};

function toIdeateEntityType(
  entityType: ChatEntityType,
): IdeateMention["entityType"] {
  if (
    entityType === "persona" ||
    entityType === "campo" ||
    entityType === "proyecto" ||
    entityType === "area"
  ) {
    return entityType;
  }
  return "tag";
}

export function IngestaAnchorInput({
  mentions,
  onChange,
  disabled = false,
  className,
}: IngestaAnchorInputProps) {
  const [draft, setDraft] = useState("");
  const [prefix, setPrefix] = useState<"@" | "#" | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string, p: "@" | "#") => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ q, limit: "20" });
      const response = await fetch(`/api/chat/mentions?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Error menciones");
      let next: MentionSuggestion[] = data.suggestions ?? [];
      if (p === "@") {
        next = next.filter((s) => s.entityType === "persona");
      } else {
        next = next.filter(
          (s) =>
            s.entityType === "campo" ||
            s.entityType === "area" ||
            s.entityType === "proyecto",
        );
      }
      setSuggestions(next);
      setActiveIndex(0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (prefix === null) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    const timer = window.setTimeout(() => {
      void fetchSuggestions(query, prefix);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [prefix, query, fetchSuggestions]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const addMention = (suggestion: MentionSuggestion, p: "@" | "#") => {
    const next: IdeateMention = {
      prefix: p,
      label: suggestion.label,
      entityId: suggestion.entityId,
      entityType: toIdeateEntityType(suggestion.entityType),
    };
    const exists = mentions.some(
      (m) =>
        m.prefix === next.prefix &&
        (m.entityId === next.entityId || m.label === next.label),
    );
    if (!exists) onChange([...mentions, next]);
    setDraft("");
    setPrefix(null);
    setQuery("");
    setIsOpen(false);
  };

  const handleChange = (value: string) => {
    setDraft(value);
    const detected = detectMentionQueryWithPrefix(value);
    if (!detected) {
      setPrefix(null);
      setQuery("");
      return;
    }
    setPrefix(detected.prefix);
    setQuery(detected.query);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || prefix === null) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(suggestions.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && suggestions[activeIndex]) {
      event.preventDefault();
      addMention(suggestions[activeIndex], prefix);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setDraft(stripMentionQuery(draft));
      setPrefix(null);
    }
  };

  const removeAt = (index: number) => {
    onChange(mentions.filter((_, i) => i !== index));
  };

  return (
    <div ref={containerRef} className={cn("relative space-y-2", className)}>
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mentions.map((mention, index) => (
            <MentionBadge
              key={`${mention.prefix}${mention.label}-${index}`}
              label={`${mention.prefix}${mention.label}`}
              entityType={
                mention.entityType === "persona"
                  ? "persona"
                  : mention.entityType === "campo"
                    ? "campo"
                    : "proyecto"
              }
              onRemove={disabled ? undefined : () => removeAt(index)}
            />
          ))}
        </div>
      )}

      <input
        type="text"
        value={draft}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (prefix) setIsOpen(true);
        }}
        placeholder="@persona o #campo / área"
        className={inputClassName}
        autoComplete="off"
      />

      {isOpen && prefix && (
        <MentionDropdown
          suggestions={suggestions}
          isLoading={isLoading}
          query={query}
          activeIndex={activeIndex}
          onSelect={(s) => addMention(s, prefix)}
          onHover={setActiveIndex}
          className="bottom-auto top-full mt-1 mb-0"
        />
      )}
    </div>
  );
}
