import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { Cinzel, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-legion",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Deprocast",
  description:
    "Ingesta de audio, transcripción simulada y estructura semántica para búsqueda vectorial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
        <Providers>
          <AppShell>{children}</AppShell>
          <Toaster richColors closeButton position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
