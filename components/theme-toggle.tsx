"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CrownIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const THEME_CYCLE = ["light", "dark", "legion"] as const;
type AppTheme = (typeof THEME_CYCLE)[number];

const THEME_META: Record<
  AppTheme,
  { label: string; nextLabel: string; Icon: typeof SunIcon }
> = {
  light: {
    label: "Diurno",
    nextLabel: "Activar modo Noir",
    Icon: MoonIcon,
  },
  dark: {
    label: "Noir",
    nextLabel: "Activar modo Legión",
    Icon: CrownIcon,
  },
  legion: {
    label: "Legión",
    nextLabel: "Activar modo Diurno",
    Icon: SunIcon,
  },
};

function resolveAppTheme(theme: string | undefined): AppTheme {
  if (theme === "legion" || theme === "theme-legion") return "legion";
  if (theme === "light") return "light";
  if (theme === "dark") return "dark";
  return "legion";
}

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn("text-muted-foreground", className)}
        disabled
        aria-hidden
      />
    );
  }

  const current = resolveAppTheme(theme);
  const nextIndex = (THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length;
  const next = THEME_CYCLE[nextIndex];
  const meta = THEME_META[current];
  const Icon = meta.Icon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn("text-muted-foreground hover:text-foreground", className)}
      onClick={() => setTheme(next)}
      aria-label={meta.nextLabel}
      title={`Tema: ${meta.label}`}
    >
      <Icon />
    </Button>
  );
}
