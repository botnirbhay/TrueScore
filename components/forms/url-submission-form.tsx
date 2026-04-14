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
  onUrlChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClearResults?: () => void;
};

function statusCopy(status: UrlSubmissionFormProps["status"], activeUrl?: string | null) {
  if (status === "loading" || status === "processing") {
    return {
      label: "Analyzing product",
      detail: activeUrl ? "Checking live pricing, reviews, and seller signals." : "Looking across live product signals."
    };
  }

  if (status === "complete") {
    return {
      label: "Analysis ready",
      detail: "Score, confidence, pricing, and supporting evidence are below."
    };
  }

  if (status === "error") {
    return {
      label: "Try another link",
      detail: "Use a public product page from a store or brand site."
    };
  }

  return {
    label: "Paste a product link",
    detail: "Get a fast read on trust, confidence, and the best live offer."
  };
}

export function UrlSubmissionForm({
  url,
  error,
  isLoading = false,
  activeUrl,
  status,
  onUrlChange,
  onSubmit,
  onClearResults
}: UrlSubmissionFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(url);
  };

  const copy = statusCopy(status, activeUrl);

  return (
    <Card className="relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.16),transparent_48%)]" />

      <div className="relative space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">Analyze a product</p>
        <h2 className="text-[1.35rem] font-semibold tracking-[-0.05em] text-white sm:text-[1.55rem]">{copy.label}</h2>
        <p className="max-w-lg text-sm leading-6 text-gray-400">{copy.detail}</p>
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
            className="w-full rounded-[18px] border border-white/10 bg-[rgba(6,8,12,0.72)] px-4 py-3.5 text-[14px] text-white outline-none transition duration-200 placeholder:text-gray-500 hover:border-white/16 hover:bg-[rgba(10,12,18,0.78)] focus:border-sky-300/60 focus:bg-[rgba(12,16,22,0.84)] focus:ring-4 focus:ring-sky-300/10"
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
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#06111b]/20 border-t-[#06111b]" />
                Analyzing product
              </>
            ) : (
              "Analyze product"
            )}
          </Button>
          {onClearResults ? (
            <Button type="button" variant="secondary" size="lg" className="w-full sm:w-auto" onClick={onClearResults}>
              Reset
            </Button>
          ) : null}
        </div>
      </form>

      <div className="relative mt-5 flex flex-wrap items-center gap-2">
        {activeUrl ? (
          <span className="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-gray-300">
            <span className="truncate">{activeUrl}</span>
          </span>
        ) : null}
        {(status === "loading" || status === "processing") ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1.5 text-[12px] font-medium text-sky-100">
            <span className="h-1.5 w-8 rounded-full bg-sky-200/80 animate-[pulse-line_1.2s_ease-in-out_infinite]" />
            Analyzing product
          </span>
        ) : null}
      </div>
    </Card>
  );
}
