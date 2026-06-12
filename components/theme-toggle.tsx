"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
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

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn("text-muted-foreground hover:text-foreground", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Activar modo diurno" : "Activar modo oscuro"}
      title={isDark ? "Modo diurno" : "Modo oscuro"}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
