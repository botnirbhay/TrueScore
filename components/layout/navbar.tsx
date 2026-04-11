export function Navbar() {
  return (
    <header className="sticky top-0 z-30 py-4">
      <div className="flex items-center justify-between rounded-[1.4rem] border border-white/10 bg-black/35 px-4 py-3 shadow-card backdrop-blur-xl sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-teal-400/20 to-cyan-400/10 text-sm font-semibold text-white">
            TS
          </div>
          <div>
            <p className="font-heading text-lg font-bold tracking-tight text-white">TrueScore</p>
            <p className="text-sm text-gray-400">Understand the signal behind every product page.</p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-300">
          MVP pipeline
        </span>
      </div>
    </header>
  );
}
