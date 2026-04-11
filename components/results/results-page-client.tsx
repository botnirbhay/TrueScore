"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ResultsDashboard } from "@/components/results/results-dashboard";
import { ResultsEmptyState, ResultsErrorState, ResultsLoadingState } from "@/components/results/results-states";
import { buildFallbackAnalysisResult, buildMockResultsModel } from "@/lib/mock-results";
import { isValidHttpUrl } from "@/lib/utils";
import type { AnalysisResult, ResultsViewModel } from "@/types";

type PageState =
  | { status: "empty" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ResultsViewModel; warning: string | null };

export function ResultsPageClient() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<PageState>({ status: "empty" });

  useEffect(() => {
    const requestedUrl = searchParams.get("url")?.trim() ?? "";

    if (!requestedUrl) {
      setState({ status: "empty" });
      return;
    }

    if (!isValidHttpUrl(requestedUrl)) {
      setState({
        status: "error",
        message: "The results page received an invalid URL. Go back and submit a full http/https product link."
      });
      return;
    }

    let cancelled = false;

    async function loadResults() {
      setState({ status: "loading" });

      try {
        const response = await fetch("/api/ingest", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({ url: requestedUrl })
        });

        const payload = (await response.json().catch(() => ({}))) as { error?: string; product?: AnalysisResult };

        if (!cancelled && response.ok && payload.product) {
          setState({
            status: "ready",
            data: buildMockResultsModel(payload.product),
            warning: "Showing in-memory evidence and scoring until crawler-backed source data is available."
          });
          return;
        }

        console.warn("[results] ingest unavailable, falling back to in-memory mock results", {
          requestedUrl,
          error: payload.error
        });

        if (!cancelled) {
          setState({
            status: "ready",
            data: buildMockResultsModel(buildFallbackAnalysisResult(requestedUrl)),
            warning: "Saved product data is unavailable right now. Displaying fallback in-memory results so you can still review the scoring layout."
          });
        }
      } catch (error) {
        console.error("[results] failed to load results", error);

        if (!cancelled) {
          setState({
            status: "ready",
            data: buildMockResultsModel(buildFallbackAnalysisResult(requestedUrl)),
            warning: "Live ingest failed in this environment. Displaying fallback in-memory results instead of an error."
          });
        }
      }
    }

    void loadResults();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-foreground/45">TrueScore</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Results</h1>
        </div>
        <Link
          href="/"
          className="inline-flex rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:border-foreground/20"
        >
          Analyze another URL
        </Link>
      </div>

      {state.status === "loading" ? <ResultsLoadingState /> : null}
      {state.status === "empty" ? <ResultsEmptyState /> : null}
      {state.status === "error" ? <ResultsErrorState message={state.message} /> : null}
      {state.status === "ready" ? <ResultsDashboard data={state.data} warning={state.warning} /> : null}
    </section>
  );
}

