import Link from "next/link";

import { Card } from "@/components/ui/card";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 py-4 sm:py-5">
      <Card className="bg-[rgba(9,10,14,0.86)] px-4 py-3 backdrop-blur-xl sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.03)_100%)] text-[13px] font-semibold text-white">
              TS
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold tracking-[-0.03em] text-white">TrueScore</p>
              <p className="truncate text-[12px] text-gray-400">Compact product-trust analysis for public URLs</p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-300">
              Single page
            </span>
            <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Job pipeline live
            </span>
          </div>
        </div>
      </Card>
    </header>
  );
}
