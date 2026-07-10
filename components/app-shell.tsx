"use client";

import { AppHeader } from "@/components/app-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </>
  );
}
