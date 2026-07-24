"use client";

import { useGenesis } from "@/components/yo/genesis-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const { ready, genesisStatus, refreshGenesis } = useGenesis();
  const [routed, setRouted] = useState(false);

  useEffect(() => {
    if (!ready) return;

    const onYo = pathname === "/yo" || pathname.startsWith("/yo/");
    const locked = genesisStatus !== "COMPLETED";

    if (locked && !onYo) {
      setRouted(false);
      router.replace("/yo");
      return;
    }

    setRouted(true);
  }, [ready, genesisStatus, pathname, router]);

  // Revalidar al navegar (p.ej. tras sellar misiones).
  useEffect(() => {
    if (!ready) return;
    void refreshGenesis();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !routed) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background px-4">
        <p className="font-mono text-[11px] tracking-[0.28em] text-accent uppercase">
          {genesisStatus !== "COMPLETED"
            ? "[ REDIRIGIENDO AL SANCTA… ]"
            : "[ VERIFICANDO NODO YO… ]"}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
