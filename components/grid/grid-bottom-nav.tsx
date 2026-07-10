"use client";

import {
  Sheet,
  SheetBody,
  SheetHeader,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  BookOpenIcon,
  BrainIcon,
  Gamepad2Icon,
  InboxIcon,
  MessageSquareIcon,
  MicIcon,
  PlusIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const PLUS_LINKS = [
  { href: "/cortex", label: "Córtex", icon: BrainIcon },
  { href: "/ingesta", label: "Ingesta", icon: InboxIcon },
  { href: "/audio", label: "Audio", icon: MicIcon },
  { href: "/chat", label: "Chat", icon: MessageSquareIcon },
  { href: "/validar", label: "Validar", icon: ShieldCheckIcon },
  { href: "/ludus", label: "Ludus", icon: Gamepad2Icon },
  { href: "/enciclopedia", label: "Enciclopedia", icon: BookOpenIcon },
] as const;

type GridBottomNavProps = {
  onPlusOpen: () => void;
  ludusMode?: boolean;
};

export function GridBottomNav({ onPlusOpen, ludusMode = false }: GridBottomNavProps) {
  const cellClass =
    "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <nav
      className="grid shrink-0 grid-cols-3 grid-rows-3 gap-1 border-t border-border p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      aria-label="Navegación principal"
    >
      <div />
      <Link href={ludusMode ? "/ludus/castillo" : "/calendario"} className={cellClass}>
        <span>{ludusMode ? "Castillo" : "Calendario"}</span>
      </Link>
      <div />

      <Link href={ludusMode ? "/ludus/campamento" : "/enciclopedia"} className={cellClass}>
        <span>{ludusMode ? "Campamento" : "Asignaturas"}</span>
      </Link>
      <button type="button" onClick={onPlusOpen} className={cellClass}>
        <PlusIcon className="size-5" />
      </button>
      <Link href="/pendientes" className={cellClass}>
        <span>Pendientes</span>
      </Link>

      <div />
      <Link href="/diario" className={cellClass}>
        <span>Diario</span>
      </Link>
      <div />
    </nav>
  );
}

export function PlusSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-[min(100vw,20rem)]"
    >
      <SheetHeader
        title="Opciones"
        onClose={() => onOpenChange(false)}
      />
      <SheetBody>
        <ul className="space-y-1">
          {PLUS_LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted",
                )}
              >
                <Icon className="size-4 text-muted-foreground" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </SheetBody>
    </Sheet>
  );
}

export function GridBottomNavWithPlus({ ludusMode = false }: { ludusMode?: boolean }) {
  const [plusOpen, setPlusOpen] = useState(false);
  return (
    <>
      <GridBottomNav onPlusOpen={() => setPlusOpen(true)} ludusMode={ludusMode} />
      <PlusSheet open={plusOpen} onOpenChange={setPlusOpen} />
    </>
  );
}
