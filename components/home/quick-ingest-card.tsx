import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, FlaskConicalIcon } from "lucide-react";
import Link from "next/link";

export function QuickIngestCard() {
  return (
    <Card className="bg-gradient-to-r from-primary/5 via-transparent to-transparent">
      <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FlaskConicalIcon className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">Ingesta de Materia Prima</p>
            <p className="text-sm text-muted-foreground">
              Cargá audios, textos y documentos en bruto al Atanor local.
            </p>
          </div>
        </div>
        <Link href="/ingesta" className={cn(buttonVariants({ size: "lg" }))}>
          Ir a Ingesta
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
