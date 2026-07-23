"use client";

import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { useState } from "react";

type AliasTagInputProps = {
  aliases: string[];
  onChange: (aliases: string[]) => void;
  className?: string;
};

function splitTokens(raw: string): string[] {
  return raw
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

export function AliasTagInput({
  aliases,
  onChange,
  className,
}: AliasTagInputProps) {
  const [draft, setDraft] = useState("");

  const commitTokens = (raw: string) => {
    const tokens = splitTokens(raw);
    if (tokens.length === 0) {
      setDraft("");
      return;
    }

    const next = [...aliases];
    const seen = new Set(aliases.map((alias) => alias.toLowerCase()));
    for (const token of tokens) {
      const key = token.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      next.push(token);
    }
    onChange(next);
    setDraft("");
  };

  return (
    <div
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        className,
      )}
    >
      {aliases.map((alias) => (
        <button
          key={alias}
          type="button"
          onClick={() => onChange(aliases.filter((item) => item !== alias))}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs transition-colors hover:bg-muted/70"
          aria-label={`Quitar alias ${alias}`}
        >
          {alias}
          <XIcon className="size-3 opacity-70" />
        </button>
      ))}
      <input
        value={draft}
        onChange={(event) => {
          const value = event.target.value;
          if (value.includes(",")) {
            commitTokens(value);
            return;
          }
          setDraft(value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitTokens(draft);
            return;
          }
          if (event.key === "Backspace" && !draft && aliases.length > 0) {
            onChange(aliases.slice(0, -1));
          }
        }}
        onBlur={() => {
          if (draft.trim()) commitTokens(draft);
        }}
        className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
        aria-label="Añadir alias"
      />
    </div>
  );
}
