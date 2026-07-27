"use client";

import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type WorkspaceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
};

/** Overlay centrado casi fullscreen (War Room). */
export function WorkspaceModal({
  open,
  onOpenChange,
  children,
  className,
}: WorkspaceModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Cerrar workspace"
        className="absolute inset-0 bg-foreground/50 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex h-[min(900px,92dvh)] w-[min(1100px,96vw)] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

type WorkspaceModalHeaderProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children?: React.ReactNode;
};

export function WorkspaceModalHeader({
  title,
  description,
  onClose,
  children,
}: WorkspaceModalHeaderProps) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="space-y-0.5">
          <h2 className="truncate font-mono text-sm font-semibold tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="truncate text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {children}
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
