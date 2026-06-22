"use client";

import { MentionBadge } from "@/components/chat/mention-badge";
import { MentionDropdown } from "@/components/chat/mention-dropdown";
import { Button } from "@/components/ui/button";
import {
  detectMentionQuery,
  stripMentionQuery,
} from "@/lib/chat/format";
import type { ChatSegment, MentionSuggestion } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { SendIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

type MentionInputProps = {
  disabled?: boolean;
  onSend: (segments: ChatSegment[]) => void;
  className?: string;
};

export function MentionInput({
  disabled = false,
  onSend,
  className,
}: MentionInputProps) {
  const [segments, setSegments] = useState<ChatSegment[]>([]);
  const [draftText, setDraftText] = useState("");
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    setIsLoadingSuggestions(true);
    try {
      const params = new URLSearchParams({ q: query, limit: "20" });
      const response = await fetch(`/api/chat/mentions?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar sugerencias");
      }
      setSuggestions(data.suggestions ?? []);
      setActiveIndex(0);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (mentionQuery === null) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    setIsDropdownOpen(true);
    const timer = window.setTimeout(() => {
      void fetchSuggestions(mentionQuery);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [mentionQuery, fetchSuggestions]);

  const handleDraftChange = (value: string) => {
    setDraftText(value);
    const query = detectMentionQuery(value);
    setMentionQuery(query);
  };

  const selectSuggestion = (suggestion: MentionSuggestion) => {
    const baseText = stripMentionQuery(draftText);
    const nextSegments: ChatSegment[] = [...segments];

    if (baseText) {
      nextSegments.push({ type: "text", value: baseText });
    }

    nextSegments.push({
      type: "mention",
      entityType: suggestion.entityType,
      entityId: suggestion.entityId,
      label: suggestion.label,
    });

    setSegments(nextSegments);
    setDraftText("");
    setMentionQuery(null);
    setIsDropdownOpen(false);
    setSuggestions([]);
    textareaRef.current?.focus();
  };

  const removeMentionAt = (index: number) => {
    setSegments((current) => current.filter((_, i) => i !== index));
  };

  const buildOutgoingSegments = (): ChatSegment[] => {
    const outgoing = [...segments];
    if (draftText.trim()) {
      outgoing.push({ type: "text", value: draftText });
    }
    return outgoing.filter(
      (segment) => segment.type !== "text" || segment.value.trim().length > 0,
    );
  };

  const canSend =
    !disabled &&
    buildOutgoingSegments().some(
      (segment) =>
        segment.type === "mention" ||
        (segment.type === "text" && segment.value.trim().length > 0),
    );

  const handleSend = () => {
    if (!canSend) return;
    const outgoing = buildOutgoingSegments();
    onSend(outgoing);
    setSegments([]);
    setDraftText("");
    setMentionQuery(null);
    setSuggestions([]);
    setIsDropdownOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isDropdownOpen && suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % suggestions.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex(
          (index) => (index - 1 + suggestions.length) % suggestions.length,
        );
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setIsDropdownOpen(false);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
      return;
    }

    if (
      event.key === "Backspace" &&
      draftText.length === 0 &&
      segments.length > 0
    ) {
      event.preventDefault();
      setSegments((current) => current.slice(0, -1));
    }
  };

  return (
    <div className={cn("relative border-t border-border bg-background p-4", className)}>
      <div className="relative mx-auto max-w-3xl">
        {isDropdownOpen ? (
          <MentionDropdown
            suggestions={suggestions}
            isLoading={isLoadingSuggestions}
            query={mentionQuery ?? ""}
            activeIndex={activeIndex}
            onSelect={selectSuggestion}
            onHover={setActiveIndex}
          />
        ) : null}

        <div className="flex items-end gap-2 rounded-xl border border-input bg-card p-3 shadow-sm">
          <div className="min-h-[72px] flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-1">
              {segments.map((segment, index) =>
                segment.type === "mention" ? (
                  <MentionBadge
                    key={`${segment.entityId}-${index}`}
                    label={segment.label}
                    entityType={segment.entityType}
                    onRemove={() => removeMentionAt(index)}
                  />
                ) : (
                  <span
                    key={`text-${index}`}
                    className="whitespace-pre-wrap font-mono text-[11px]"
                  >
                    {segment.value}
                  </span>
                ),
              )}
            </div>
            <textarea
              ref={textareaRef}
              value={draftText}
              onChange={(event) => handleDraftChange(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              rows={3}
              placeholder="Escribí tu mensaje… Usá @ para mencionar proyectos, retos, áreas o personas."
              className="w-full resize-none bg-transparent font-mono text-[11px] outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
          </div>
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Enviar mensaje"
          >
            <SendIcon className="size-4" />
          </Button>
        </div>
        <p className="mt-2 font-mono text-[9px] text-muted-foreground">
          Enter para enviar · Shift+Enter nueva línea · @ para contexto
        </p>
      </div>
    </div>
  );
}
