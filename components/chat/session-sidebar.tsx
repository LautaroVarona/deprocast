"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatSessionSummary } from "@/lib/chat/types";
import { MessageSquarePlusIcon, Trash2Icon } from "lucide-react";

type SessionSidebarProps = {
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  isLoading: boolean;
  onSelect: (sessionId: string) => void;
  onCreate: () => void;
  onDelete: (sessionId: string) => void;
  className?: string;
};

export function SessionSidebar({
  sessions,
  activeSessionId,
  isLoading,
  onSelect,
  onCreate,
  onDelete,
  className,
}: SessionSidebarProps) {
  return (
    <aside
      className={cn(
        "flex w-64 shrink-0 flex-col border-r border-border bg-muted/20",
        className,
      )}
    >
      <div className="border-b border-border p-3">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2 font-mono text-[10px]"
          onClick={onCreate}
          disabled={isLoading}
        >
          <MessageSquarePlusIcon className="size-3.5" />
          Nueva conversación
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && sessions.length === 0 ? (
          <p className="px-2 py-4 font-mono text-[10px] text-muted-foreground">
            Cargando sesiones…
          </p>
        ) : null}

        {!isLoading && sessions.length === 0 ? (
          <p className="px-2 py-4 font-mono text-[10px] text-muted-foreground">
            Sin conversaciones todavía.
          </p>
        ) : null}

        <ul className="space-y-1">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <li key={session.id}>
                <div
                  className={cn(
                    "group flex items-start gap-1 rounded-lg border border-transparent",
                    isActive && "border-border bg-background shadow-sm",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(session.id)}
                    className="min-w-0 flex-1 px-3 py-2 text-left"
                  >
                    <p className="truncate text-xs font-medium">{session.title}</p>
                    <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                      {session.messageCount} mensajes ·{" "}
                      {new Date(session.updatedAt).toLocaleDateString("es-AR")}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(session.id)}
                    className="mt-2 mr-2 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Eliminar ${session.title}`}
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
