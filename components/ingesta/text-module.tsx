import { TextIngestForm } from "@/components/text-ingest-form";
import { TypeIcon } from "lucide-react";

export function TextModule() {
  return (
    <section aria-label="Ingesta de texto" className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary dark:text-primary">
          <TypeIcon className="size-4" aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-semibold">Texto manual</h3>
          <p className="text-xs text-muted-foreground">
            Flujos de conciencia, notas de cuadernos o chats de IA íntegros,
            anclados a un Campo.
          </p>
        </div>
      </div>
      <TextIngestForm />
    </section>
  );
}
