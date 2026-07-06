"use client";

import { cn } from "@/lib/utils";
import type { IncubationMessage } from "@/lib/projects/incubation/schema";
import { BotIcon, Loader2Icon, UserIcon } from "lucide-react";
import { useEffect, useRef } from "react";

type IncubationChatPanelProps = {
  messages: IncubationMessage[];
  isSending?: boolean;
  disabled?: boolean;
  onSend: (message: string) => void;
  className?: string;
};

export function IncubationChatPanel({
  messages,
  isSending = false,
  disabled = false,
  onSend,
  className,
}: IncubationChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSubmit = () => {
    const text = draftRef.current.trim();
    if (!text || isSending || disabled) return;
    onSend(text);
    draftRef.current = "";
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            return (
              <div
                key={`${message.createdAt}-${index}`}
                className={cn(
                  "flex gap-3",
                  isUser ? "flex-row-reverse" : "flex-row",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md border",
                    isUser
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {isUser ? (
                    <UserIcon className="size-3.5" />
                  ) : (
                    <BotIcon className="size-3.5" />
                  )}
                </span>
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg border px-3 py-2",
                    isUser
                      ? "border-primary/20 bg-primary/5"
                      : "border-border bg-card",
                  )}
                >
                  <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                    {message.content}
                  </p>
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex items-center gap-2 px-2 font-mono text-[10px] text-muted-foreground">
              <Loader2Icon className="size-3.5 animate-spin" />
              Incubador pensando…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2">
          <textarea
            ref={textareaRef}
            rows={2}
            disabled={disabled || isSending}
            placeholder="Contale al Incubador sobre tu proyecto…"
            className="min-h-[2.5rem] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 font-mono text-[11px] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            onChange={(event) => {
              draftRef.current = event.target.value;
              event.target.style.height = "auto";
              event.target.style.height = `${event.target.scrollHeight}px`;
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            disabled={disabled || isSending}
            onClick={handleSubmit}
            className="shrink-0 self-end rounded-lg border border-primary bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
