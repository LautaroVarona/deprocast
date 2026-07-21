"use client";

import { MentionBadge } from "@/components/chat/mention-badge";
import { cn } from "@/lib/utils";
import type { ChatMessageDto } from "@/lib/chat/types";
import { BotIcon, UserIcon } from "lucide-react";
import { useEffect, useRef } from "react";

type MessageListProps = {
  messages: ChatMessageDto[];
  isLoading?: boolean;
  className?: string;
};

function MessageContent({ message }: { message: ChatMessageDto }) {
  if (message.role === "user" && message.contentDisplay?.length) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        {message.contentDisplay.map((segment, index) =>
          segment.type === "mention" ? (
            <MentionBadge
              key={`${segment.entityId}-${index}`}
              label={segment.label}
              entityType={segment.entityType}
            />
          ) : (
            <span
              key={`text-${index}`}
              className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed"
            >
              {segment.value}
            </span>
          ),
        )}
      </div>
    );
  }

  return (
    <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
      {message.content}
    </p>
  );
}

export function MessageList({
  messages,
  isLoading = false,
  className,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className={cn("flex-1 overflow-y-auto px-4 py-6", className)}>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.length === 0 && !isLoading ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <p className="text-sm font-medium">Exocórtex listo</p>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              Mencioná entidades con @ para anclar contexto de proyectos,
              retos, áreas y personas antes de enviar tu pregunta.
            </p>
          </div>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                isUser ? "justify-end" : "justify-start",
              )}
            >
              {!isUser ? (
                <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <BotIcon className="size-3.5" />
                </div>
              ) : null}

              <div
                className={cn(
                  "max-w-[85%] rounded-xl border px-4 py-3",
                  isUser
                    ? "border-primary/20 bg-primary/5"
                    : "border-border bg-card",
                )}
              >
                <MessageContent message={message} />
                <time
                  dateTime={message.createdAt}
                  className="mt-2 block font-mono text-[10px] text-muted-foreground"
                >
                  {new Date(message.createdAt).toLocaleString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "short",
                  })}
                </time>
              </div>

              {isUser ? (
                <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <UserIcon className="size-3.5" />
                </div>
              ) : null}
            </div>
          );
        })}

        {isLoading ? (
          <div className="flex items-center gap-3">
            <div className="flex size-7 items-center justify-center rounded-lg bg-muted">
              <BotIcon className="size-3.5 animate-pulse" />
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="font-mono text-[10px] text-muted-foreground">
                Recuperando contexto y pensando…
              </p>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
