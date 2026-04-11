export function Navbar() {
  return (
    <header className="sticky top-0 z-20 py-4">
      <div className="flex items-center justify-between rounded-2xl border border-white/60 bg-panel/80 px-4 py-3 shadow-card backdrop-blur sm:px-5">
        <div>
          <p className="font-heading text-lg font-bold tracking-tight">TrueScore</p>
          <p className="text-sm text-foreground/60">Product URL scoring MVP</p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">
          Local-only
        </span>
      </div>
    </header>
  );
}

