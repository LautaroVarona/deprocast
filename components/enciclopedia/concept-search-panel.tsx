"use client";

import { useEnciclopedia } from "@/components/enciclopedia/enciclopedia-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { useState, type FormEvent } from "react";

export function ConceptSearchPanel() {
  const { exploreConcept, isBusy, currentEntry } = useEnciclopedia();
  const [concept, setConcept] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await exploreConcept(concept, { asRoot: true });
    setConcept("");
  }

  return (
    <section className="enciclopedia-noir-panel space-y-4 p-5">
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent/60">
          01 · Pregunta
        </p>
        <h2 className="font-mono text-sm font-medium text-muted-foreground">
          ¿Qué querés entender?
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Escribí una palabra, una idea o una pregunta. La IA generará una
          explicación clara con ejemplos y contexto.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={concept}
          onChange={(event) => setConcept(event.target.value)}
          placeholder={
            currentEntry
              ? "Explorar otro concepto desde cero…"
              : "Ej: entropía, fotosíntesis, derecho romano…"
          }
          disabled={isBusy}
          className={cn(
            "min-w-0 flex-1 rounded-lg border border-border bg-card/80 px-3 py-2.5",
            "font-mono text-sm text-muted-foreground placeholder:text-muted-foreground",
            "outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20",
          )}
        />
        <Button
          type="submit"
          disabled={isBusy || !concept.trim()}
          className="bg-accent/90 font-mono text-xs uppercase tracking-wider text-black hover:bg-accent/20"
        >
          {isBusy ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SearchIcon className="size-4" />
          )}
          Explorar
        </Button>
      </form>
    </section>
  );
}
