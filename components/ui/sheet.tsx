"use client";

import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
};

export function Sheet({ open, onOpenChange, children, className }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Cerrar panel"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex h-full w-full max-w-lg flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-200",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

type SheetHeaderProps = {
  title: string;
  description?: string;
  onClose: () => void;
};

export function SheetHeader({ title, description, onClose }: SheetHeaderProps) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0 space-y-0.5">
        <h2 className="truncate font-mono text-sm font-semibold tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground"
        onClick={onClose}
      >
        <XIcon />
      </Button>
    </div>
  );
}

export function SheetBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-3", className)}>
      {children}
    </div>
  );
}

export function SheetFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-border bg-background/95 px-4 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
