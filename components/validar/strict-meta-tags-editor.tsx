"use client";

import {
  META_TAG_SLOTS,
  arrayToStrictMetaTags,
  strictMetaTagsToArray,
  type StrictMetaTags,
} from "@/lib/purifier/meta-tags-taxonomy";
import { cn } from "@/lib/utils";

type StrictMetaTagsEditorProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
};

export function StrictMetaTagsEditor({
  tags,
  onChange,
  className,
}: StrictMetaTagsEditorProps) {
  const structured: StrictMetaTags = arrayToStrictMetaTags(tags);

  const updateSlot = (key: keyof StrictMetaTags, value: string) => {
    onChange(
      strictMetaTagsToArray({
        ...structured,
        [key]: value,
      }),
    );
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {META_TAG_SLOTS.map((slot) => (
        <div key={slot.key} className="space-y-0.5">
          <label
            htmlFor={`meta-tag-${slot.key}`}
            className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase"
            title={slot.description}
          >
            {slot.label}
          </label>
          <input
            id={`meta-tag-${slot.key}`}
            type="text"
            value={structured[slot.key]}
            onChange={(event) => updateSlot(slot.key, event.target.value)}
            placeholder={slot.description}
            className="h-7 w-full rounded border border-input bg-background px-2 font-mono text-[10px] outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
      ))}
      <p className="font-mono text-[9px] text-muted-foreground">
        6 etiquetas obligatorias · taxonomía fija
      </p>
    </div>
  );
}
