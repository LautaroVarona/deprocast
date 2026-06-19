"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TagIcon, XIcon } from "lucide-react";
import { useState } from "react";

type TagPillsInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
};

export function TagPillsInput({
  tags,
  onChange,
  placeholder = "Añadir etiqueta…",
  className,
}: TagPillsInputProps) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const tag = input.trim();
    if (!tag || tags.includes(tag)) {
      setInput("");
      return;
    }
    onChange([...tags, tag]);
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((item) => item !== tag));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="h-7 min-w-0 flex-1 rounded border border-input bg-background px-2 font-mono text-[10px] outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={addTag}
          aria-label="Añadir etiqueta"
        >
          <TagIcon className="size-3.5" />
        </Button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag(tag)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px] transition-colors hover:bg-muted/70"
            >
              {tag}
              <XIcon className="size-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
