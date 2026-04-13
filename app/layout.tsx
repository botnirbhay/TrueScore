import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { Navbar } from "@/components/layout/navbar";

export const metadata: Metadata = {
  title: "TrueScore",
  description: "A lightweight MVP for product URL analysis."
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased dark">
        <div className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.14),_transparent_60%)]" />
          <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
            <Navbar />
            <main className="flex-1 py-10 sm:py-14">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
