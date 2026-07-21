"use client";

import { ThemeProvider } from "next-themes";
import { BabelProvider } from "@/components/babel/babel-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="legion"
      enableSystem={false}
      themes={["light", "dark", "legion"]}
      value={{ light: "light", dark: "dark", legion: "theme-legion" }}
      storageKey="deprocast-theme"
      disableTransitionOnChange
    >
      <BabelProvider>{children}</BabelProvider>
    </ThemeProvider>
  );
}
