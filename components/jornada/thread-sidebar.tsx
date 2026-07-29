"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon, MessageSquareIcon } from "lucide-react";
import { createNewThread } from "@/lib/jornada/actions";

type Thread = {
  id: string;
  title: string;
  topic: string | null;
  messages: { id: string }[];
};

type Props = {
  sessionId: string;
  threads: Thread[];
  activeThreadId: string | null;
  isClosed: boolean;
  onSelectThread: (id: string) => void;
  onThreadCreated: () => void;
};

export function ThreadSidebar({
  sessionId,
  threads,
  activeThreadId,
  isClosed,
  onSelectThread,
  onThreadCreated,
}: Props) {
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    const t = title.trim();
    if (!t) return;
    startTransition(async () => {
      const result = await createNewThread(sessionId, t);
      if (result.ok) {
        setTitle("");
        onThreadCreated();
      }
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 px-3 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400/80">
          Hilos del día
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {threads.map((thread) => (
            <motion.button
              key={thread.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              onClick={() => onSelectThread(thread.id)}
              className={`flex w-full items-start gap-2 border-b border-zinc-800/50 px-3 py-2.5 text-left transition-colors ${
                thread.id === activeThreadId
                  ? "bg-amber-500/10 text-amber-200"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <MessageSquareIcon className="mt-0.5 size-3.5 shrink-0 opacity-50" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{thread.title}</p>
                <p className="font-mono text-[10px] text-zinc-500">
                  {thread.messages.length} msg
                </p>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {threads.length === 0 && (
          <p className="px-3 py-6 text-center font-mono text-[10px] text-zinc-600">
            Sin hilos aún. Creá uno para empezar.
          </p>
        )}
      </div>

      {!isClosed && (
        <div className="border-t border-zinc-800 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              placeholder="Nuevo hilo…"
              className="flex-1 rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none"
            />
            <button
              onClick={handleCreate}
              disabled={isPending || !title.trim()}
              className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2.5 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/25 disabled:opacity-40"
            >
              <PlusIcon className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
