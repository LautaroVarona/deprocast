import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type KbdProps = ComponentProps<"kbd">;

function Kbd({ className, ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Kbd };
