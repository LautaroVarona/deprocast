"use client";

import { useBabel } from "@/components/babel/babel-context";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

type QuickIdeasPanelProps = {
  onCreated: () => void;
};

export function QuickIdeasPanel({ onCreated }: QuickIdeasPanelProps) {
  const { universeFetch, bumpTemporal } = useBabel();
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await universeFetch("/api/pendientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), targetDay: "today" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo crear la idea.");
      setTitle("");
      bumpTemporal();
      onCreated();
      toast.success("Idea rápida creada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear idea.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
        Ideas rápidas
      </p>
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Nueva tarea en transición..."
          className="flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white outline-none"
        />
        <Button size="sm" onClick={() => void handleCreate()} disabled={isSubmitting}>
          Crear
        </Button>
      </div>
    </div>
  );
}
