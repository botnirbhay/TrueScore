import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";

import "@/app/globals.css";
import { Navbar } from "@/components/layout/navbar";
import { cn } from "@/lib/utils";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body-family",
  weight: ["400", "500", "600"]
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading-family",
  weight: ["500", "700"]
});

export const metadata: Metadata = {
  title: "TrueScore",
  description: "A lightweight MVP for product URL analysis."
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={cn(bodyFont.variable, headingFont.variable, "bg-background text-foreground antialiased")}>
        <div className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.18),_transparent_60%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-[radial-gradient(circle_at_bottom,_rgba(245,158,11,0.14),_transparent_55%)]" />
          <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
            <Navbar />
            <main className="flex-1 py-10 sm:py-14">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
