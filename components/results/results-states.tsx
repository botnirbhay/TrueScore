import Link from "next/link";

type ResultsStateProps = {
  title: string;
  description: string;
  tone?: "default" | "error";
};

function ResultsState({ title, description, tone = "default" }: ResultsStateProps) {
  return (
    <section className="rounded-[2rem] border border-border bg-panel/95 p-8 shadow-card">
      <div
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
          tone === "error" ? "bg-red-50 text-red-700" : "bg-white text-foreground/55"
        }`}
      >
        {tone === "error" ? "Error" : "Ready"}
      </div>
      <h2 className="mt-5 font-heading text-3xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-foreground/70">{description}</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:border-foreground/20"
      >
        Back to landing page
      </Link>
    </section>
  );
}

export function ResultsEmptyState() {
  return (
    <ResultsState
      title="No product selected yet"
      description="Submit a product URL from the landing page to generate a score summary, evidence cards, and pricing overview."
    />
  );
}

export function ResultsErrorState({ message }: { message: string }) {
  return <ResultsState title="Unable to load results" description={message} tone="error" />;
}

export function ResultsLoadingState() {
  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-border bg-panel/95 p-8 shadow-card">
        <div className="h-5 w-24 animate-pulse rounded-full bg-foreground/10" />
        <div className="mt-5 h-10 w-2/3 animate-pulse rounded-2xl bg-foreground/10" />
        <div className="mt-3 h-5 w-1/2 animate-pulse rounded-2xl bg-foreground/10" />
        <div className="mt-8 grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="aspect-square animate-pulse rounded-[1.75rem] bg-foreground/10" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="h-28 animate-pulse rounded-3xl bg-foreground/10" />
            <div className="h-28 animate-pulse rounded-3xl bg-foreground/10" />
            <div className="h-28 animate-pulse rounded-3xl bg-foreground/10" />
            <div className="h-28 animate-pulse rounded-3xl bg-foreground/10" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-[2rem] bg-white/70 shadow-card" />
        <div className="h-80 animate-pulse rounded-[2rem] bg-white/70 shadow-card" />
      </div>
    </section>
  );
}

