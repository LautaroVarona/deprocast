"use client";

import { AudioChannel } from "@/components/ingesta/channels/audio-channel";
import { TablesChannel } from "@/components/ingesta/channels/tables-channel";
import { TextChannel } from "@/components/ingesta/channels/text-channel";
import { VisionChannel } from "@/components/ingesta/channels/vision-channel";
import { XBookmarksChannel } from "@/components/ingesta/channels/x-bookmarks-channel";
import { GravityPanel } from "@/components/ingesta/gravity-panel";
import {
  IngestaProvider,
  useIngesta,
  type IngestaChannel,
} from "@/components/ingesta/ingesta-context";
import { cn } from "@/lib/utils";
import { BookMarkedIcon } from "lucide-react";
import Link from "next/link";

const CHANNELS: {
  id: IngestaChannel;
  label: string;
  icon: string;
}[] = [
  { id: "texto", label: "Texto", icon: "📝" },
  { id: "audio", label: "Audio", icon: "🎙️" },
  { id: "tablas", label: "Tablas", icon: "📊" },
  { id: "vision", label: "Visión", icon: "👁️" },
  { id: "x-bookmarks", label: "X", icon: "𝕏" },
];

function IngestaWorkspaceInner() {
  const { activeChannel, setActiveChannel } = useIngesta();

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background text-foreground">
      <GravityPanel />

      <div className="flex min-w-0 flex-[80] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
              Aduana · Prima Materia
            </p>
            <h1 className="truncate text-sm font-semibold">Ingesta local</h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/ingesta/cuadernos"
              className={cn(
                "inline-flex items-center gap-1 rounded border border-border px-2 py-1",
                "font-mono text-[10px] text-muted-foreground transition-colors",
                "hover:border-foreground/30 hover:text-foreground",
              )}
            >
              <BookMarkedIcon className="size-3" aria-hidden />
              <span className="hidden sm:inline">Cuadernos</span>
            </Link>

            <div
              className="flex shrink-0 gap-0.5 rounded-md border border-border bg-muted/40 p-0.5"
              role="tablist"
              aria-label="Canales de ingesta"
            >
              {CHANNELS.map((channel) => {
              const isActive = activeChannel === channel.id;
              return (
                <button
                  key={channel.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveChannel(channel.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-[10px] transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span aria-hidden>{channel.icon}</span>
                  <span className="hidden sm:inline">{channel.label}</span>
                </button>
              );
              })}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden p-3">
          {activeChannel === "texto" && <TextChannel />}
          {activeChannel === "audio" && <AudioChannel />}
          {activeChannel === "tablas" && <TablesChannel />}
          {activeChannel === "vision" && <VisionChannel />}
          {activeChannel === "x-bookmarks" && <XBookmarksChannel />}
        </div>
      </div>
    </div>
  );
}

export function IngestaWorkspace() {
  return (
    <IngestaProvider>
      <IngestaWorkspaceInner />
    </IngestaProvider>
  );
}
