import Link from "next/link";

type ResultsStateProps = {
  title: string;
  description: string;
  tone?: "default" | "error";
};

function ResultsState({ title, description, tone = "default" }: ResultsStateProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 shadow-card backdrop-blur">
      <div
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
          tone === "error" ? "border border-rose-500/20 bg-rose-500/10 text-rose-300" : "border border-white/10 bg-white/5 text-gray-300"
        }`}
      >
        {tone === "error" ? "Error" : "Ready"}
      </div>
      <h2 className="mt-5 font-heading text-3xl font-semibold tracking-tight text-white">{title}</h2>
      <p className="mt-3 max-w-2xl text-base leading-8 text-gray-400">{description}</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/8"
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
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 shadow-card backdrop-blur">
        <div className="h-5 w-24 animate-pulse rounded-full bg-white/10" />
        <div className="mt-5 h-10 w-2/3 animate-pulse rounded-2xl bg-white/10" />
        <div className="mt-3 h-5 w-1/2 animate-pulse rounded-2xl bg-white/8" />
        <div className="mt-8 grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="aspect-square animate-pulse rounded-[1.75rem] bg-white/8" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="h-28 animate-pulse rounded-3xl bg-white/8" />
            <div className="h-28 animate-pulse rounded-3xl bg-white/8" />
            <div className="h-28 animate-pulse rounded-3xl bg-white/8" />
            <div className="h-28 animate-pulse rounded-3xl bg-white/8" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-card" />
        <div className="h-80 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-card" />
      </div>
    </section>
  );
}

export function ResultsProcessingState({
  status,
  message
}: {
  status: "queued" | "crawling" | "scoring";
  message: string;
}) {
  const labels = [
    { key: "queued", label: "Queued" },
    { key: "crawling", label: "Crawling" },
    { key: "scoring", label: "Scoring" }
  ] as const;

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 shadow-card backdrop-blur">
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-300">
          Processing
        </div>
        <h2 className="mt-5 font-heading text-3xl font-semibold tracking-tight text-white">Building your TrueScore result</h2>
        <p className="mt-3 max-w-2xl text-base leading-8 text-gray-400">{message}</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {labels.map((item, index) => {
            const activeIndex = labels.findIndex((label) => label.key === status);
            const isComplete = index < activeIndex;
            const isActive = item.key === status;

            return (
              <div
                key={item.key}
                className={`rounded-[1.6rem] border p-4 shadow-sm transition ${
                  isActive
                    ? "border-teal-400/35 bg-teal-400/10"
                    : isComplete
                      ? "border-emerald-400/20 bg-emerald-400/8"
                      : "border-white/10 bg-black/20"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Step {index + 1}</p>
                <p className="mt-2 font-heading text-xl font-semibold tracking-tight text-white">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
