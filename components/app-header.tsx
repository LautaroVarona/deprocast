"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { FlaskConicalIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/ingesta", label: "Ingesta" },
  { href: "/validar", label: "Validar" },
  { href: "/proyectos", label: "Proyectos" },
] as const;

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="flex h-14 w-full items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
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
              link.href === "/"
                ? pathname === "/"
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

        <div className="ml-auto flex items-center gap-1">
          <span className="hidden text-xs text-muted-foreground md:block">
            Exoesqueleto Cognitivo · local
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
