"use client";

import { FormEvent, useState } from "react";

import { ResultsPlaceholder } from "@/components/results/results-placeholder";
import { extractHostname, isValidHttpUrl } from "@/lib/utils";
import type { AnalysisResult } from "@/types";

const initialUrl = "https://example.com/product";

export function UrlSubmissionForm() {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Enter a product URL to continue.");
      setResult(null);
      return;
    }

    if (!isValidHttpUrl(trimmedUrl)) {
      setError("Enter a valid URL starting with http:// or https://.");
      setResult(null);
      return;
    }

    setError("");

    // Future backend integration:
    // Replace this local object with a POST request to an API route such as
    // `app/api/analyze/route.ts` or a server action when scoring logic exists.
    setResult({
      submittedUrl: trimmedUrl,
      hostname: extractHostname(trimmedUrl),
      status: "Ready for analysis",
      summary: "This is a placeholder response rendered from local state.",
      checkedAt: new Date().toLocaleString()
    });
  };

  return (
    <div className="rounded-[2rem] border border-border bg-panel/90 p-5 shadow-card backdrop-blur sm:p-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-foreground/45">Start here</p>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Submit a product URL</h2>
        <p className="text-sm leading-6 text-foreground/65">
          Enter any public product page URL. Validation stays on the client until backend analysis is connected.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/75" htmlFor="product-url">
            Product URL
          </label>
          <input
            id="product-url"
            name="product-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://brand.com/products/item"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "product-url-error" : undefined}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base text-foreground outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
          {error ? (
            <p id="product-url-error" className="text-sm font-medium text-red-600">
              {error}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-foreground/15 sm:w-auto sm:min-w-40"
        >
          Analyze URL
        </button>
      </form>

      <ResultsPlaceholder result={result} />
    </div>
  );
}

