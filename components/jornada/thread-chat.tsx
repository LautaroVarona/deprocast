"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SendIcon, Loader2Icon } from "lucide-react";
import { sendMessage } from "@/lib/jornada/actions";

type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: string | Date;
};

type Props = {
  threadId: string;
  threadTitle: string;
  messages: Message[];
  isClosed: boolean;
  onMessageSent: () => void;
};

export function ThreadChat({
  threadId,
  threadTitle,
  messages,
  isClosed,
  onMessageSent,
}: Props) {
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  function handleSend() {
    const text = input.trim();
    if (!text || isPending) return;
    setError(null);
    setInput("");

    startTransition(async () => {
      const result = await sendMessage(threadId, text);
      if (!result.ok) {
        setError(result.error);
      }
      onMessageSent();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Hilo activo
        </p>
        <h2 className="text-sm font-medium text-zinc-200">{threadTitle}</h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 ${msg.role === "user" ? "text-right" : ""}`}
            >
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                {msg.role === "user" ? "Operador" : "Copiloto"}
              </span>
              <div
                className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-amber-500/10 text-amber-100"
                    : "bg-zinc-800/60 text-zinc-300"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 py-2 text-zinc-500"
          >
            <Loader2Icon className="size-3.5 animate-spin" />
            <span className="font-mono text-[10px] uppercase tracking-wider">
              Destilando respuesta…
            </span>
          </motion.div>
        )}

        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </div>

      {/* Input */}
      {!isClosed && (
        <div className="border-t border-zinc-800 p-3">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí algo… (Ctrl+Enter para enviar)"
              rows={2}
              className="flex-1 resize-none rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={isPending || !input.trim()}
              className="flex items-center self-end rounded-md bg-amber-500/15 px-3 py-2 text-amber-300 transition-colors hover:bg-amber-500/25 disabled:opacity-40"
            >
              <SendIcon className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
