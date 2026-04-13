"use client";

import { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type UrlSubmissionFormProps = {
  url: string;
  error?: string;
  isLoading?: boolean;
  activeUrl?: string | null;
  status: "idle" | "loading" | "processing" | "complete" | "error";
  processingStage?: "queued" | "crawling" | "scoring" | null;
  statusMessage?: string | null;
  onUrlChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClearResults?: () => void;
};

const formSteps = [
  { label: "Queued", value: "Request accepted" },
  { label: "Crawling", value: "Evidence collection running" },
  { label: "Scoring", value: "Model composes the result" }
] as const;

export function UrlSubmissionForm({
  url,
  error,
  isLoading = false,
  activeUrl,
  status,
  processingStage,
  statusMessage,
  onUrlChange,
  onSubmit,
  onClearResults
}: UrlSubmissionFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(url);
  };

  return (
    <Card className="relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_70%)]" />

      <div className="relative space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Analyze product</p>
        <h2 className="text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">Run the pipeline inline</h2>
        <p className="text-sm leading-6 text-gray-400">
          Enter a public product URL and keep the workspace intact. Processing, progress, and results all render on this page.
        </p>
      </div>

      <form className="relative mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2.5">
          <label className="text-[13px] font-medium text-gray-300" htmlFor="product-url">
            Product URL
          </label>
          <input
            id="product-url"
            name="product-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://brand.com/products/item"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "product-url-error" : undefined}
            className="w-full rounded-[16px] border border-white/10 bg-black/20 px-4 py-3.5 text-[14px] text-white outline-none transition duration-150 placeholder:text-gray-500 hover:border-white/15 hover:bg-black/25 focus:border-sky-400/60 focus:bg-black/30 focus:ring-4 focus:ring-sky-400/10"
          />
          {error ? (
            <p id="product-url-error" className="text-[13px] font-medium text-rose-400">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" size="lg" className="w-full sm:flex-1" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#09090b]/25 border-t-[#09090b]" />
                Processing
              </>
            ) : (
              "Analyze Product"
            )}
          </Button>
          {onClearResults ? (
            <Button type="button" variant="secondary" size="lg" className="w-full sm:w-auto" onClick={onClearResults}>
              Clear
            </Button>
          ) : null}
        </div>
      </form>

      <div className="relative mt-6 rounded-[18px] border border-white/10 bg-black/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Session</p>
            <p className="mt-2 break-all text-sm font-medium text-white">{activeUrl ? activeUrl : "Waiting for a URL submission"}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-300">
            {status}
          </span>
        </div>

        <div className="mt-4 grid gap-2.5">
          {formSteps.map((step, index) => {
            const stageIndex =
              processingStage === "queued" ? 0 : processingStage === "crawling" ? 1 : processingStage === "scoring" ? 2 : -1;
            const activeIndex = status === "processing" ? stageIndex : status === "complete" ? 2 : status === "loading" ? 0 : -1;
            const isActive = status === "processing" && index === activeIndex;
            const isComplete = status === "complete" || index < activeIndex;

            return (
              <div
                key={step.label}
                className={`flex items-center justify-between gap-3 rounded-[14px] border px-3.5 py-3 text-sm transition ${
                  isActive
                    ? "border-sky-400/35 bg-sky-400/10 text-white"
                    : isComplete
                      ? "border-emerald-400/20 bg-emerald-400/10 text-gray-100"
                      : "border-white/8 bg-white/[0.03] text-gray-400"
                }`}
              >
                <div>
                  <p className="font-medium">{step.label}</p>
                  <p className="mt-0.5 text-[12px] opacity-80">{step.value}</p>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{index + 1}</span>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[13px] leading-6 text-gray-400">
          {statusMessage ?? "The existing ingest, job, polling, and scoring flow is preserved and presented inline."}
        </p>
      </div>
    </Card>
  );
}
