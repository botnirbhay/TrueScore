"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ResultsDashboard } from "@/components/results/results-dashboard";
import {
  ResultsEmptyState,
  ResultsErrorState,
  ResultsLoadingState,
  ResultsProcessingState
} from "@/components/results/results-states";
import { isValidHttpUrl } from "@/lib/utils";
import type { ProcessingJobStatus, ResultsViewModel } from "@/types";

type PageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "processing"; jobId: string; stage: Extract<ProcessingJobStatus, "queued" | "crawling" | "scoring">; message: string }
  | { status: "complete"; data: ResultsViewModel; warning: string | null }
  | { status: "error"; message: string };

type JobPayload = {
  job?: {
    id: string;
    url: string;
    status: ProcessingJobStatus;
    message: string;
    cached: boolean;
    error?: string | null;
    result?: ResultsViewModel | null;
  };
  error?: string;
};

export function ResultsPageClient() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<PageState>({ status: "idle" });
  const pollingJobId = state.status === "processing" ? state.jobId : null;

  useEffect(() => {
    const requestedUrl = searchParams.get("url")?.trim() ?? "";

    if (!requestedUrl) {
      setState({ status: "idle" });
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

        const payload = (await response.json().catch(() => ({}))) as JobPayload;
        const job = payload.job;

        if (!response.ok || !job) {
          if (!cancelled) {
            setState({
              status: "error",
              message: payload.error ?? "Failed to start product processing."
            });
          }
          return;
        }

        if (job.status === "complete" && job.result) {
          setState({
            status: "complete",
            data: job.result,
            warning: job.cached ? "Loaded from cached results." : job.message === "Results ready." ? null : job.message
          });
          return;
        }

        if (!cancelled) {
          setState({
            status: "processing",
            jobId: job.id,
            stage: job.status as Extract<ProcessingJobStatus, "queued" | "crawling" | "scoring">,
            message: job.message
          });
        }
      } catch (error) {
        console.error("[results] failed to start processing", error);

        if (!cancelled) {
          setState({
            status: "error",
            message: "Unable to start processing for this product URL."
          });
        }
      }
    }

    void loadResults();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (state.status !== "processing") {
      return;
    }

    const jobId = state.jobId;
    let cancelled = false;

    async function pollStatus() {
      try {
        const response = await fetch(`/api/status?jobId=${encodeURIComponent(jobId)}`, {
          cache: "no-store"
        });
        const payload = (await response.json().catch(() => ({}))) as JobPayload;
        const job = payload.job;

        if (!response.ok || !job) {
          if (!cancelled) {
            setState({
              status: "error",
              message: payload.error ?? "Unable to fetch job status."
            });
          }
          return;
        }

        if (job.status === "complete" && job.result) {
          if (!cancelled) {
            setState({
              status: "complete",
              data: job.result,
              warning: job.cached ? "Loaded from cached results." : job.message === "Results ready." ? null : job.message
            });
          }
          return;
        }

        if (job.status === "failed") {
          if (!cancelled) {
            setState({
              status: "error",
              message: job.error ?? "The processing job failed."
            });
          }
          return;
        }

        if (!cancelled) {
          setState({
            status: "processing",
            jobId: job.id,
            stage: job.status as Extract<ProcessingJobStatus, "queued" | "crawling" | "scoring">,
            message: job.message
          });
          window.setTimeout(() => {
            void pollStatus();
          }, 1200);
        }
      } catch (error) {
        console.error("[results] polling failed", error);

        if (!cancelled) {
          setState({
            status: "error",
            message: "Lost connection while waiting for results."
          });
        }
      }
    }

    void pollStatus();

    return () => {
      cancelled = true;
    };
  }, [pollingJobId, state.status]);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">TrueScore</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">Results</h1>
        </div>
        <Link
          href="/"
          className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/8"
        >
          Analyze another URL
        </Link>
      </div>

      {state.status === "loading" ? <ResultsLoadingState /> : null}
      {state.status === "idle" ? <ResultsEmptyState /> : null}
      {state.status === "processing" ? <ResultsProcessingState status={state.stage} message={state.message} /> : null}
      {state.status === "error" ? <ResultsErrorState message={state.message} /> : null}
      {state.status === "complete" ? <ResultsDashboard data={state.data} warning={state.warning} /> : null}
    </section>
  );
}
