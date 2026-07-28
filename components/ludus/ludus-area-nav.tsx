"use client";

import { LUDUS_AREAS, TRITURADORA_HREF } from "@/lib/ludus/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function LudusAreaNav() {
  const pathname = usePathname();
  const trituradoraActive = pathname.startsWith(TRITURADORA_HREF);

  return (
    <nav
      className="flex shrink-0 items-center justify-center gap-1 border-b border-border px-3 py-2"
      aria-label="Áreas de Ludus"
    >
      {LUDUS_AREAS.map((area) => {
        const isActive = pathname.startsWith(area.href);
        return (
          <Link
            key={area.id}
            href={area.href}
            className={cn(
              "rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
              isActive
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              !area.available && "pointer-events-none opacity-40",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {area.name}
          </Link>
        );
      })}
      <Link
        href={TRITURADORA_HREF}
        className={cn(
          "rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
          trituradoraActive
            ? "bg-[#FFB000]/15 text-[#FFB000]"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        aria-current={trituradoraActive ? "page" : undefined}
      >
        Trituradora
      </Link>
    </nav>
  );
}
