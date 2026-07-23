"use client";

import { getYoAction } from "@/app/yo/actions";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type GenesisGateProps = {
  children: React.ReactNode;
};

/**
 * Bloquea el exoesqueleto hasta completar el Protocolo Génesis en /yo.
 */
export function GenesisGate({ children }: GenesisGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const onYo = pathname === "/yo" || pathname.startsWith("/yo/");
      const result = await getYoAction();
      if (cancelled) return;

      if (!result.ok) {
        setReady(true);
        setBlocking(false);
        return;
      }

      const incomplete = !result.data.genesisCompleted;
      setBlocking(incomplete);

      if (incomplete && !onYo) {
        router.replace("/yo");
        return;
      }

      setReady(true);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background px-4">
        <p className="font-mono text-[11px] tracking-[0.28em] text-accent uppercase">
          {blocking
            ? "[ REDIRIGIENDO A GÉNESIS… ]"
            : "[ VERIFICANDO NODO YO… ]"}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
