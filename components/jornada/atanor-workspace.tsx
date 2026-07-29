"use client";

import { useState, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PanelLeftIcon,
  PanelRightIcon,
  FlaskConicalIcon,
} from "lucide-react";
import { getOrCreateTodaySession } from "@/lib/jornada/actions";
import type { DailySessionFull } from "@/lib/jornada/actions";
import { ThreadSidebar } from "@/components/jornada/thread-sidebar";
import { ThreadChat } from "@/components/jornada/thread-chat";
import { ContextInspector } from "@/components/jornada/context-inspector";

type Props = {
  initialSession: DailySessionFull;
};

const panelVariants = {
  open: (width: number) => ({
    width,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  }),
  closed: {
    width: 0,
    opacity: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
};

export function AtanorWorkspace({ initialSession }: Props) {
  const [session, setSession] = useState(initialSession);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialSession.threads[0]?.id ?? null,
  );
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await getOrCreateTodaySession();
      if (result.ok) {
        setSession(result.data);
      }
    });
  }, []);

  const activeThread = session.threads.find((t) => t.id === activeThreadId);
  const activeContexts = activeThread?.contexts ?? [];

  return (
    <div className="jornada-noir-root flex h-[calc(100dvh-3.5rem)] flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <FlaskConicalIcon className="size-4 text-amber-400/80" />
          <h1 className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-400">
            Atanor Temporal
          </h1>
          <span className="font-mono text-[10px] text-zinc-600">
            {session.date}
          </span>
          {session.isClosed && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-400">
              Coagulada
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowLeft((v) => !v)}
            className={`rounded p-1.5 transition-colors ${showLeft ? "text-amber-400" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            <PanelLeftIcon className="size-4" />
          </button>
          <button
            onClick={() => setShowRight((v) => !v)}
            className={`rounded p-1.5 transition-colors ${showRight ? "text-amber-400" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            <PanelRightIcon className="size-4" />
          </button>
        </div>
      </header>

      {/* 3-column layout */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left: Thread Sidebar */}
        <AnimatePresence initial={false}>
          {showLeft && (
            <motion.div
              key="sidebar"
              custom={240}
              variants={panelVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="shrink-0 overflow-hidden border-r border-zinc-800"
            >
              <ThreadSidebar
                sessionId={session.id}
                threads={session.threads}
                activeThreadId={activeThreadId}
                isClosed={session.isClosed}
                onSelectThread={setActiveThreadId}
                onThreadCreated={refresh}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center: Chat */}
        <div className="min-w-0 flex-1">
          {activeThread ? (
            <ThreadChat
              threadId={activeThread.id}
              threadTitle={activeThread.title}
              messages={activeThread.messages}
              isClosed={session.isClosed}
              onMessageSent={refresh}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <FlaskConicalIcon className="mx-auto mb-3 size-8 text-zinc-700" />
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                  {session.threads.length === 0
                    ? "Creá un hilo para empezar la jornada"
                    : "Seleccioná un hilo"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Inspector */}
        <AnimatePresence initial={false}>
          {showRight && (
            <motion.div
              key="inspector"
              custom={260}
              variants={panelVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="shrink-0 overflow-hidden border-l border-zinc-800"
            >
              <ContextInspector
                sessionId={session.id}
                threadId={activeThreadId}
                contexts={activeContexts}
                isClosed={session.isClosed}
                summaryMarkdown={session.summaryMarkdown}
                onUpdated={refresh}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
