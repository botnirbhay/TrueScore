import { Card } from "@/components/ui/card";

type ResultsStateProps = {
  title: string;
  description: string;
  tone?: "default" | "error";
};

function ResultsState({ title, description, tone = "default" }: ResultsStateProps) {
  return (
    <Card className="px-6 py-6 sm:px-7 sm:py-7">
      <div
        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
          tone === "error" ? "border border-rose-500/20 bg-rose-500/10 text-rose-300" : "border border-white/10 bg-white/5 text-gray-300"
        }`}
      >
        {tone === "error" ? "Issue" : "Ready"}
      </div>
      <h2 className="mt-5 text-[1.9rem] font-semibold tracking-[-0.05em] text-white">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">{description}</p>
    </Card>
  );
}

export function ResultsEmptyState() {
  return (
    <ResultsState
      title="Start with a product link"
      description="Paste a public product URL to see the trust score, confidence level, best live price, and the strongest supporting signals."
    />
  );
}

export function ResultsErrorState({ message }: { message: string }) {
  return <ResultsState title="We couldn't analyze that product yet" description={message} tone="error" />;
}

function LoadingShell() {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.035]">
      <div className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)] animate-[shimmer_1.8s_linear_infinite]" />
      <div className="relative p-4">
        <div className="h-3 w-24 rounded-full bg-white/10" />
        <div className="mt-4 h-6 w-3/4 rounded-full bg-white/10" />
        <div className="mt-3 h-3.5 w-1/2 rounded-full bg-white/8" />
      </div>
    </div>
  );
}

export function ResultsLoadingState() {
  return (
    <section className="space-y-5">
      <Card className="overflow-hidden px-6 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100">
              <span className="h-1.5 w-8 rounded-full bg-sky-200/80 animate-[pulse-line_1.2s_ease-in-out_infinite]" />
              Analyzing product
            </div>
            <h2 className="mt-5 text-[2rem] font-semibold tracking-[-0.06em] text-white">Gathering the strongest live signals</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              We'll show the score, confidence, best price, and the clearest supporting evidence as soon as everything is ready.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4">
            <LoadingShell />
            <div className="grid gap-4 sm:grid-cols-3">
              <LoadingShell />
              <LoadingShell />
              <LoadingShell />
            </div>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-white/[0.035] p-5">
            <div className="aspect-[4/3] rounded-[20px] bg-white/[0.06]" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <LoadingShell />
        <LoadingShell />
        <LoadingShell />
      </div>
    </section>
  );
}

export function ResultsProcessingState() {
  return <ResultsLoadingState />;
}
