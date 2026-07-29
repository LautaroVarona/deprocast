"use client";

import { useGenesis } from "@/components/yo/genesis-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type GenesisGateProps = {
  children: React.ReactNode;
};

/**
 * Bloquea el exoesqueleto hasta completar el Protocolo Génesis.
 * PENDING_NAMES / PENDING_MISSIONS → solo /yo.
 */
export function GenesisGate({ children }: GenesisGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, genesisStatus, navigationUnlocked, refreshGenesis } =
    useGenesis();
  const lastPathRef = useRef<string | null>(null);
  const onYo = pathname === "/yo" || pathname.startsWith("/yo/");
  const locked = !navigationUnlocked;

  useEffect(() => {
    if (!ready) return;
    if (locked && !onYo) {
      router.replace("/yo");
    }
  }, [ready, locked, onYo, router]);

  // Revalidar en cambio de ruta, sin bloquear la UI (anti-regresión en provider).
  useEffect(() => {
    if (!ready) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    void refreshGenesis();
  }, [pathname, ready, refreshGenesis]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background px-4">
        <p className="font-mono text-[11px] tracking-[0.28em] text-accent uppercase">
          [ VERIFICANDO NODO YO… ]
        </p>
      </div>
    );
  }

  if (locked && !onYo) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background px-4">
        <p className="font-mono text-[11px] tracking-[0.28em] text-accent uppercase">
          [ REDIRIGIENDO AL SANCTA… ]
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
