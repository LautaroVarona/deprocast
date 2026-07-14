"use client";

import { UniverseSelect } from "@/components/babel/universe-select";

export function UniverseHeader() {
  return (
    <div className="hidden sm:block" aria-label="Universo activo">
      <UniverseSelect />
    </div>
  );
}
