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
          <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.05),transparent)]" />
          <div className="relative mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-4 sm:px-6 lg:px-8">
            <Navbar />
            <main className="flex-1 py-6 sm:py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
