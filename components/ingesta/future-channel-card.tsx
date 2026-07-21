import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type FlowStep = {
  icon: LucideIcon;
  label: string;
};

type FutureChannelCardProps = {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  description: string;
  dropHint: string;
  flow: FlowStep[];
  footer?: ReactNode;
};

export function FutureChannelCard({
  icon: Icon,
  iconClassName,
  title,
  description,
  dropHint,
  flow,
  footer,
}: FutureChannelCardProps) {
  return (
    <Card className="relative">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              iconClassName,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <Badge
            variant="outline"
            className="border-accent/50 bg-accent/10 text-accent dark:text-accent"
          >
            Preparando Atanor
          </Badge>
        </div>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          aria-disabled="true"
          className="flex h-24 cursor-not-allowed items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 text-center text-xs text-muted-foreground/70 select-none"
        >
          {dropHint}
        </div>

        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {flow.map((step, index) => (
            <li
              key={step.label}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span className="flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1">
                <step.icon className="size-3.5 shrink-0" aria-hidden />
                {step.label}
              </span>
              {index < flow.length - 1 && (
                <ArrowRightIcon
                  className="size-3 shrink-0 text-muted-foreground/50"
                  aria-hidden
                />
              )}
            </li>
          ))}
        </ol>
      </CardContent>

      {footer && (
        <CardFooter className="text-xs text-muted-foreground">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
