"use client";

import { AppHeader } from "@/components/app-header";
import { CommandMenu, useCommandMenu } from "@/components/command-menu/command-menu";
import { GenesisGate } from "@/components/yo/genesis-gate";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useCommandMenu();

  return (
    <>
      <AppHeader onOpenCommandMenu={() => setOpen(true)} />
      <CommandMenu open={open} onOpenChange={setOpen} />
      <GenesisGate>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </GenesisGate>
    </>
  );
}
