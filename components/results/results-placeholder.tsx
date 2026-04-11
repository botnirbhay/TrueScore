import type { AnalysisResult } from "@/types";

type ResultsPlaceholderProps = {
  result: AnalysisResult | null;
};

export function ResultsPlaceholder({ result }: ResultsPlaceholderProps) {
  return (
    <section className="mt-8 rounded-3xl border border-dashed border-border bg-background/70 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-foreground/45">Results</p>
          <h3 className="mt-1 font-heading text-xl font-semibold tracking-tight">Analysis placeholder</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-foreground/60 shadow-sm">
          MVP
        </span>
      </div>

      {!result ? (
        <div className="mt-5 grid gap-3 text-sm text-foreground/65">
          <p>No URL submitted yet. When you submit one, a placeholder result will appear here.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-white/80 p-4">
              <p className="font-medium text-foreground/55">Future score</p>
              <p className="mt-2 text-lg font-semibold text-foreground">Pending backend</p>
            </div>
            <div className="rounded-2xl border border-border bg-white/80 p-4">
              <p className="font-medium text-foreground/55">Future enrichment</p>
              <p className="mt-2 text-lg font-semibold text-foreground">API route placeholder</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          <div className="rounded-2xl border border-border bg-white p-4">
            <p className="text-sm font-medium text-foreground/55">Submitted URL</p>
            <p className="mt-2 break-all text-sm text-foreground">{result.submittedUrl}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-sm font-medium text-foreground/55">Hostname</p>
              <p className="mt-2 font-heading text-lg font-semibold">{result.hostname}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-sm font-medium text-foreground/55">Status</p>
              <p className="mt-2 font-heading text-lg font-semibold">{result.status}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-sm font-medium text-foreground/55">Checked at</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{result.checkedAt}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-4">
            <p className="text-sm font-medium text-foreground/55">Summary</p>
            <p className="mt-2 text-sm leading-6 text-foreground/75">{result.summary}</p>
          </div>
        </div>
      )}
    </section>
  );
}

