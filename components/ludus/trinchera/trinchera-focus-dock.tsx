"use client";

import { LaboratorioSonoro } from "@/components/ludus/sound-lab/laboratorio-sonoro";
import { TrincheraSidePanel } from "@/components/ludus/trinchera/trinchera-side-panel";
import type { TrincheraSnapshot } from "@/lib/ludus/types";

type TrincheraFocusDockProps = {
  snapshot: TrincheraSnapshot;
};

export function TrincheraFocusDock({ snapshot }: TrincheraFocusDockProps) {
  return (
    <aside className="flex min-h-0 w-full flex-col overflow-hidden bg-[#050506] lg:w-[36%]">
      <div className="min-h-[45%] border-b border-white/[0.06]">
        <LaboratorioSonoro snapshot={snapshot} variant="compact" className="h-full min-h-0" />
      </div>
      <div className="min-h-0 flex-1">
        <TrincheraSidePanel snapshot={snapshot} />
      </div>
    </aside>
  );
}
