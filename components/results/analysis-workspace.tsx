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
  | { status: "processing"; jobId: string }
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

const featurePoints = ["Live market pricing", "Real review signals", "Simple decision summary"] as const;

const trustPillars = [
  {
    title: "Score first",
    detail: "See the overall product read immediately, with confidence attached."
  },
  {
    title: "Best price surfaced",
    detail: "The lowest live offer is highlighted up front instead of buried in a comparison table."
  },
  {
    title: "Evidence kept concise",
    detail: "Only the clearest signals are shown so the page stays easy to scan."
  }
] as const;

const FRIENDLY_ANALYSIS_ERROR = "We couldn't analyze that product yet. Try a cleaner product page URL.";
const FRIENDLY_MISSING_JOB_ERROR = "We couldn't keep that analysis session alive. Try analyzing the product again.";
const FRIENDLY_CONNECTION_ERROR = "We lost the connection before results were ready. Try again.";

function sanitizeCompletionWarning(message: string | null | undefined, cached: boolean) {
  if (cached) {
    return "Showing a recent saved result for this product.";
  }

  if (!message || message === "Results ready.") {
    return null;
  }

  if (/low confidence|partial|no structured evidence|failed/i.test(message)) {
    return "Live evidence was limited for this product, so confidence may be lower than usual.";
  }

  return null;
}

function friendlyErrorFromStatus(status: number, phase: "ingest" | "status" | "failed") {
  if (phase === "status" && status === 404) {
    return FRIENDLY_MISSING_JOB_ERROR;
  }

  if (phase === "status") {
    return FRIENDLY_CONNECTION_ERROR;
  }

  if (phase === "failed") {
    return FRIENDLY_ANALYSIS_ERROR;
  }

  return FRIENDLY_ANALYSIS_ERROR;
}

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
        message: "Enter a full public product URL starting with http:// or https://."
      };
    }

    return { status: "loading" };
  });
  const requestCounterRef = useRef(1);
  const activeRequestIdRef = useRef(initialRequest?.requestId ?? -1);
  const submittedUrl = request?.url ?? null;
  const pollingJobId = state.status === "processing" ? state.jobId : null;
  const hostLabel = useMemo(() => (submittedUrl ? extractHostname(submittedUrl) : null), [submittedUrl]);
  const shouldShowResults = state.status !== "idle" || Boolean(submittedUrl);

  useEffect(() => {
    if (!request) {
      return;
    }

    const requestedUrl = request.url;
    const requestId = request.requestId;
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

        if (cancelled || activeRequestIdRef.current !== requestId) {
          return;
        }

        if (!response.ok || !job) {
          setState({
            status: "error",
            message: friendlyErrorFromStatus(response.status, "ingest")
          });
          return;
        }

        if (job.status === "complete" && job.result) {
          setState({
            status: "complete",
            data: job.result,
            warning: sanitizeCompletionWarning(job.message, job.cached)
          });
          return;
        }

        setState({
          status: "processing",
          jobId: job.id
        });
      } catch (error) {
        console.error("[analysis] failed to start processing", error);

        if (!cancelled && activeRequestIdRef.current === requestId) {
          setState({
            status: "error",
            message: FRIENDLY_ANALYSIS_ERROR
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
    if (!pollingJobId) {
      return;
    }

    const jobId = pollingJobId;
    let cancelled = false;
    let timerId: number | null = null;

    async function pollStatus() {
      try {
        const response = await fetch(`/api/status?jobId=${encodeURIComponent(jobId)}`, {
          cache: "no-store"
        });
        const payload = (await response.json().catch(() => ({}))) as JobPayload;
        const job = payload.job;

        if (cancelled) {
          return;
        }

        if (!response.ok || !job) {
          setState({
            status: "error",
            message: friendlyErrorFromStatus(response.status, "status")
          });
          return;
        }

        if (job.status === "complete" && job.result) {
          setState({
            status: "complete",
            data: job.result,
            warning: sanitizeCompletionWarning(job.message, job.cached)
          });
          return;
        }

        if (job.status === "failed") {
          setState({
            status: "error",
            message: friendlyErrorFromStatus(200, "failed")
          });
          return;
        }

        timerId = window.setTimeout(() => {
          void pollStatus();
        }, 1200);
      } catch (error) {
        console.error("[analysis] polling failed", error);

        if (!cancelled) {
          setState({
            status: "error",
            message: FRIENDLY_CONNECTION_ERROR
          });
        }
      }
    }

    void pollStatus();

    return () => {
      cancelled = true;

      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [pollingJobId]);

  function handleAnalyze(nextUrl: string) {
    const trimmedUrl = nextUrl.trim();

    if (!trimmedUrl) {
      setFormError("Enter a product URL to continue.");
      return;
    }

    if (!isValidHttpUrl(trimmedUrl)) {
      setFormError("Enter a valid public URL starting with http:// or https://.");
      return;
    }

    const nextRequestId = requestCounterRef.current++;

    setFormError("");
    setUrl(trimmedUrl);
    setState({ status: "loading" });
    activeRequestIdRef.current = nextRequestId;

    startTransition(() => {
      setRequest({
        url: trimmedUrl,
        requestId: nextRequestId
      });
    });
  }

  function handleClearResults() {
    activeRequestIdRef.current = -1;
    setUrl("");
    setRequest(null);
    setState({ status: "idle" });
    setFormError("");
  }

  const isBusy = state.status === "loading" || state.status === "processing";

  return (
    <div className="space-y-6 pb-10 sm:space-y-7 sm:pb-14">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_400px]">
        <Card className="relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_26%)]" />

          <div className="relative flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-300">
              TrueScore
            </span>
            <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100">
              Live product analysis
            </span>
          </div>

          <div className="relative mt-6 max-w-3xl">
            <h1 className="max-w-2xl text-[2.4rem] font-semibold tracking-[-0.075em] text-white sm:text-[4rem]">
              Decide faster with a cleaner read on product trust.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-gray-300">
              Paste a product URL and get one simple answer surface: the score, how confident it is, the best live price,
              and the clearest reasons behind it.
            </p>
          </div>

          <div className="relative mt-8 flex flex-wrap gap-2">
            {featurePoints.map((point) => (
              <span
                key={point}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[12px] font-medium text-gray-200"
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

      <section className="grid gap-4 lg:grid-cols-3">
        {trustPillars.map((pillar) => (
          <Card key={pillar.title} className="px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Why it works</p>
            <h2 className="mt-3 text-[1.02rem] font-semibold tracking-[-0.03em] text-white">{pillar.title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">{pillar.detail}</p>
          </Card>
        ))}
      </section>

      {shouldShowResults ? (
        <section className="space-y-4 animate-[rise-in_320ms_ease-out]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Analysis</p>
              <h2 className="mt-1 text-[1.6rem] font-semibold tracking-[-0.05em] text-white sm:text-[2rem]">
                {hostLabel ? `Results for ${hostLabel}` : "Your result"}
              </h2>
            </div>
            {state.status === "complete" ? (
              <Button variant="secondary" size="sm" onClick={() => handleAnalyze(url)}>
                Refresh result
              </Button>
            ) : null}
          </div>

          {state.status === "loading" ? <ResultsLoadingState /> : null}
          {state.status === "processing" ? <ResultsProcessingState /> : null}
          {state.status === "error" ? <ResultsErrorState message={state.message} /> : null}
          {state.status === "complete" ? <ResultsDashboard data={state.data} warning={state.warning} /> : null}
        </section>
      ) : null}
    </div>
  );
}
