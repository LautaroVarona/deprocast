import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatEntityType } from "@/lib/chat/types";
import { XIcon } from "lucide-react";

const ENTITY_VARIANT: Record<
  ChatEntityType,
  "default" | "secondary" | "outline"
> = {
  proyecto: "default",
  reto: "secondary",
  area: "outline",
  persona: "default",
  campo: "outline",
  laboral_reto: "secondary",
};

type MentionBadgeProps = {
  label: string;
  entityType: ChatEntityType;
  onRemove?: () => void;
  className?: string;
};

export function MentionBadge({
  label,
  entityType,
  onRemove,
  className,
}: MentionBadgeProps) {
  return (
    <Badge
      variant={ENTITY_VARIANT[entityType]}
      className={cn(
        "mx-0.5 inline-flex h-6 max-w-full align-baseline font-mono text-[10px]",
        className,
      )}
    >
      <span className="truncate">@{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 inline-flex shrink-0 rounded-full hover:bg-background/20"
          aria-label={`Quitar mención ${label}`}
        >
          <XIcon className="size-2.5" />
        </button>
      ) : null}
    </Badge>
  );
}
