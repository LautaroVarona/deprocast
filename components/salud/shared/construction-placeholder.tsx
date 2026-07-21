import { HeartPulseIcon } from "lucide-react";

type ConstructionPlaceholderProps = {
  title?: string;
  subtitle: string;
};

export function ConstructionPlaceholder({
  title = "En construcción",
  subtitle,
}: ConstructionPlaceholderProps) {
  return (
    <div className="flex min-h-[320px] flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="rounded-full border border-border bg-card p-4">
          <HeartPulseIcon className="size-8 text-muted-foreground" />
        </div>
        <span className="rounded-full border border-border bg-muted px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
