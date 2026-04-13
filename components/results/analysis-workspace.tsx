"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { UrlSubmissionForm } from "@/components/forms/url-submission-form";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { ResultsErrorState, ResultsLoadingState, ResultsProcessingState } from "@/components/results/results-states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { extractHostname, isValidHttpUrl } from "@/lib/utils";
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

type AnalysisRequest = {
  url: string;
  requestId: number;
};

type AnalysisWorkspaceProps = {
  initialUrl?: string;
};

const pipelineSteps = [
  { label: "Ingest", detail: "Normalize the source page and seed product metadata." },
  { label: "Collect", detail: "Pull reviews, pricing evidence, and merchant signals." },
  { label: "Score", detail: "Return a trust readout with confidence and explanation." }
] as const;

const proofPoints = [
  "Inline processing and result reveal",
  "Evidence-backed trust and pricing signal",
  "Same-page workflow across desktop and mobile"
] as const;

export function AnalysisWorkspace({ initialUrl = "" }: AnalysisWorkspaceProps) {
  const normalizedInitialUrl = initialUrl.trim();
  const initialRequest = normalizedInitialUrl && isValidHttpUrl(normalizedInitialUrl) ? { url: normalizedInitialUrl, requestId: 0 } : null;
  const [url, setUrl] = useState(normalizedInitialUrl);
  const [formError, setFormError] = useState("");
  const [request, setRequest] = useState<AnalysisRequest | null>(initialRequest);
  const [state, setState] = useState<PageState>(() => {
    if (!normalizedInitialUrl) {
      return { status: "idle" };
    }

    if (!isValidHttpUrl(normalizedInitialUrl)) {
      return {
        status: "error",
        message: "The provided URL is invalid. Enter a full http:// or https:// product link to run analysis."
      };
    }

    return { status: "loading" };
  });
  const requestCounterRef = useRef(1);
  const pollingJobId = state.status === "processing" ? state.jobId : null;
  const submittedUrl = request?.url ?? null;
  const hostLabel = useMemo(() => (submittedUrl ? extractHostname(submittedUrl) : null), [submittedUrl]);
  const shouldShowResults = state.status !== "idle" || Boolean(submittedUrl);

  useEffect(() => {
    if (!request) {
      return;
    }

    const requestedUrl = request.url;
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
          if (!cancelled) {
            setState({
              status: "complete",
              data: job.result,
              warning: job.cached ? "Loaded from cached results." : job.message === "Results ready." ? null : job.message
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
        }
      } catch (error) {
        console.error("[analysis] failed to start processing", error);

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
  }, [request]);

  useEffect(() => {
    if (state.status !== "processing") {
      return;
    }

    const jobId = state.jobId;
    let cancelled = false;
    let timerId: number | null = null;

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

          timerId = window.setTimeout(() => {
            void pollStatus();
          }, 1200);
        }
      } catch (error) {
        console.error("[analysis] polling failed", error);

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

      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, [pollingJobId, state.status]);

  function handleAnalyze(nextUrl: string) {
    const trimmedUrl = nextUrl.trim();

    if (!trimmedUrl) {
      setFormError("Enter a product URL to continue.");
      return;
    }

    if (!isValidHttpUrl(trimmedUrl)) {
      setFormError("Enter a valid URL starting with http:// or https://.");
      return;
    }

    setFormError("");
    setUrl(trimmedUrl);
    setState({ status: "loading" });

    startTransition(() => {
      setRequest({
        url: trimmedUrl,
        requestId: requestCounterRef.current++
      });
    });
  }

  function handleClearResults() {
    setRequest(null);
    setState({ status: "idle" });
    setFormError("");
  }

  const isBusy = state.status === "loading" || state.status === "processing";

  return (
    <div className="space-y-7 pb-10 sm:space-y-8 sm:pb-14">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_400px]">
        <Card className="relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,_rgba(120,119,198,0.15),_transparent_68%)]" />

          <div className="relative flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white">Single-page flow</span>
            <span>Linear-inspired UI</span>
          </div>

          <div className="relative mt-6 max-w-3xl">
            <h1 className="max-w-2xl text-[2rem] font-semibold tracking-[-0.06em] text-white sm:text-[3.25rem]">
              Product trust scoring that stays in one workspace.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400 sm:text-[15px]">
              Submit any public product page. TrueScore ingests the listing, crawls supporting evidence, and reveals the score
              directly below the form without breaking the flow.
            </p>
          </div>

          <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
            {pipelineSteps.map((step, index) => (
              <div
                key={step.label}
                className="rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">0{index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-white">{step.label}</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">{step.detail}</p>
              </div>
            ))}
          </div>

          <div className="relative mt-7 flex flex-wrap gap-2">
            {proofPoints.map((point) => (
              <span
                key={point}
                className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[12px] font-medium text-gray-300"
              >
                {point}
              </span>
            ))}
          </div>
        </Card>

        <UrlSubmissionForm
          url={url}
          error={formError}
          isLoading={isBusy}
          activeUrl={submittedUrl}
          status={state.status}
          processingStage={state.status === "processing" ? state.stage : null}
          statusMessage={state.status === "processing" ? state.message : state.status === "complete" ? "Results ready inline." : null}
          onUrlChange={(value) => {
            setUrl(value);
            if (formError) {
              setFormError("");
            }
          }}
          onSubmit={handleAnalyze}
          onClearResults={shouldShowResults ? handleClearResults : undefined}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="px-5 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">System</p>
              <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">Compact workflow, same scoring pipeline</h2>
            </div>
            <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Inline reveal
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">Input</p>
              <p className="mt-2 text-sm font-medium text-white">Public product URL</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">Engine</p>
              <p className="mt-2 text-sm font-medium text-white">Ingest, job queue, poll, score</p>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">Output</p>
              <p className="mt-2 text-sm font-medium text-white">Trust result with evidence below</p>
            </div>
          </div>
        </Card>

        <Card className="px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Included</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-gray-300">
            <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">Product identity, brand, image, and source URL</div>
            <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">Trust score, confidence, price floor, and breakdowns</div>
            <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">Review evidence, quality tags, and offer comparisons</div>
          </div>
        </Card>
      </section>

      {shouldShowResults ? (
        <section className="space-y-4 animate-[rise-in_320ms_ease-out]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Analysis output</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">
                {hostLabel ? `Results for ${hostLabel}` : "Analysis results"}
              </h2>
            </div>
            {state.status === "complete" ? (
              <Button variant="secondary" size="sm" onClick={() => handleAnalyze(url)}>
                Re-run analysis
              </Button>
            ) : null}
          </div>

          {state.status === "loading" ? <ResultsLoadingState /> : null}
          {state.status === "processing" ? <ResultsProcessingState status={state.stage} message={state.message} /> : null}
          {state.status === "error" ? <ResultsErrorState message={state.message} /> : null}
          {state.status === "complete" ? <ResultsDashboard data={state.data} warning={state.warning} /> : null}
        </section>
      ) : null}
    </div>
  );
}
