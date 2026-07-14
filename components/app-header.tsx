"use client";

import { LudusHeader } from "@/components/ludus/ludus-header";
import { UniverseHeader } from "@/components/babel/universe-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FlaskConicalIcon, Gamepad2Icon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { NAV_LINKS } from "@/lib/navigation/routes";

type AppHeaderProps = {
  onOpenCommandMenu?: () => void;
};

export function AppHeader({ onOpenCommandMenu }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith("/ludus")) {
    return <LudusHeader onOpenCommandMenu={onOpenCommandMenu} />;
  }

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="flex h-14 w-full items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Link href="/cortex" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FlaskConicalIcon className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            DeProcast
          </span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Principal">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/cortex"
                ? pathname === "/cortex" || pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <UniverseHeader />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden gap-1.5 font-mono text-[10px] uppercase tracking-wider sm:inline-flex"
            onClick={onOpenCommandMenu}
          >
            <span className="rounded border border-border px-1 py-0.5">ESC</span>
            Menú
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 rounded-full bg-gradient-to-r from-amber-600 to-violet-600 text-white shadow-md shadow-amber-500/15 hover:from-amber-500 hover:to-violet-500"
            onClick={() => router.push("/ludus")}
          >
            <Gamepad2Icon className="size-3.5" aria-hidden />
            Entrar
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
