"use client";

import { HistorialTrigger } from "@/components/historial/historial-sheet";
import { LudusHeader } from "@/components/ludus/ludus-header";
import { UniverseHeader } from "@/components/babel/universe-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuPortal,
  DropdownMenuPositioner,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TOP_NAV_MENUS,
  TOP_NAV_PINNED,
  resolveTopNavMenuItems,
} from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";
import {
  ChevronDownIcon,
  FlaskConicalIcon,
  Gamepad2Icon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type AppHeaderProps = {
  onOpenCommandMenu?: () => void;
};

function isRouteActive(pathname: string, href: string) {
  if (href === "/yo") return pathname === "/yo";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader({ onOpenCommandMenu }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith("/ludus")) {
    return <LudusHeader onOpenCommandMenu={onOpenCommandMenu} />;
  }

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="flex h-14 w-full items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link href="/yo" className="flex shrink-0 items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FlaskConicalIcon className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            DeProcast
          </span>
        </Link>

        <nav
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-visible"
          aria-label="Principal"
        >
          {TOP_NAV_PINNED.map((link) => {
            const isActive = isRouteActive(pathname, link.href);
            return (
              <Link
                key={link.id}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1.5 font-mono text-xs font-medium uppercase tracking-wide transition-colors sm:px-3 sm:text-sm sm:normal-case sm:tracking-normal",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}

          <span
            className="mx-1 hidden h-4 w-px bg-border sm:block"
            aria-hidden
          />

          {TOP_NAV_MENUS.map((menu) => {
            const items = resolveTopNavMenuItems(menu);
            const isGroupActive = items.some((item) =>
              isRouteActive(pathname, item.href),
            );

            return (
              <DropdownMenu key={menu.id}>
                <DropdownMenuTrigger
                  className={cn(
                    "group/nav-menu inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 font-mono text-xs font-medium uppercase tracking-wide transition-colors outline-none sm:px-3 sm:text-sm sm:normal-case sm:tracking-normal",
                    "focus-visible:ring-2 focus-visible:ring-ring/50",
                    "data-popup-open:bg-muted data-popup-open:text-foreground",
                    isGroupActive
                      ? "bg-muted/70 text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {menu.label}
                  <ChevronDownIcon
                    className="size-3 opacity-60 transition-transform group-data-popup-open/nav-menu:rotate-180"
                    aria-hidden
                  />
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuPositioner align="start">
                    <DropdownMenuContent className="min-w-48 border-accent/25 bg-background font-mono shadow-xl shadow-black/40">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const isActive = isRouteActive(pathname, item.href);
                        return (
                          <DropdownMenuLinkItem
                            key={item.id}
                            href={item.href}
                            className={cn(
                              "gap-2.5 text-xs uppercase tracking-[0.12em]",
                              isActive && "bg-muted text-foreground",
                            )}
                            render={<Link href={item.href} />}
                          >
                            <Icon
                              className="size-3.5 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                            <span className="truncate">{item.label}</span>
                          </DropdownMenuLinkItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenuPositioner>
                </DropdownMenuPortal>
              </DropdownMenu>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <HistorialTrigger
            isActive={pathname.startsWith("/historial")}
            className="hidden sm:inline-flex"
          />
          <HistorialTrigger
            isActive={pathname.startsWith("/historial")}
            showLabel={false}
            className="sm:hidden"
          />
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
