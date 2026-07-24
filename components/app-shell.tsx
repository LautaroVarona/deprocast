"use client";

import { AppHeader } from "@/components/app-header";
import {
  CommandMenu,
  useCommandMenu,
} from "@/components/command-menu/command-menu";
import {
  GenesisProvider,
  useGenesis,
} from "@/components/yo/genesis-context";
import { GenesisGate } from "@/components/yo/genesis-gate";
import { AnimatePresence, motion } from "framer-motion";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { navigationUnlocked, navRevealToken, ready } = useGenesis();
  const { open, setOpen } = useCommandMenu({
    disabled: !navigationUnlocked,
  });

  return (
    <>
      <AnimatePresence>
        {ready && navigationUnlocked ? (
          <motion.div
            key={`nav-${navRevealToken}`}
            initial={
              navRevealToken > 0
                ? { opacity: 0, y: -28 }
                : { opacity: 1, y: 0 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0"
          >
            <AppHeader onOpenCommandMenu={() => setOpen(true)} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {navigationUnlocked ? (
        <CommandMenu open={open} onOpenChange={setOpen} />
      ) : null}

      <GenesisGate>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </GenesisGate>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <GenesisProvider>
      <AppShellInner>{children}</AppShellInner>
    </GenesisProvider>
  );
}
