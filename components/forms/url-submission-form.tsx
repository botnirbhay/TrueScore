"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { isValidHttpUrl } from "@/lib/utils";

const initialUrl = "https://example.com/product";

export function UrlSubmissionForm() {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Enter a product URL to continue.");
      return;
    }

    if (!isValidHttpUrl(trimmedUrl)) {
      setError("Enter a valid URL starting with http:// or https://.");
      return;
    }

    setError("");
    setIsLoading(true);
    router.push(`/results?url=${encodeURIComponent(trimmedUrl)}`);
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-card backdrop-blur-xl sm:p-6">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-teal-400/10 blur-3xl" />

      <div className="relative space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-gray-500">Start here</p>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">Paste a product URL</h2>
        <p className="text-sm leading-7 text-gray-400">
          Enter any public product page URL. TrueScore will open a dedicated results view with scoring, pricing evidence, and
          crawl progress states.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300" htmlFor="product-url">
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
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-base text-white outline-none transition duration-200 placeholder:text-gray-500 hover:border-white/20 focus:border-teal-400/70 focus:bg-black/40 focus:ring-4 focus:ring-teal-400/15"
          />
          {error ? (
            <p id="product-url-error" className="text-sm font-medium text-rose-400">
              {error}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition duration-200 hover:scale-[1.01] hover:from-teal-300 hover:to-cyan-300 focus:outline-none focus:ring-4 focus:ring-teal-400/20 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:min-w-44"
        >
          {isLoading ? "Opening Results..." : "Analyze Product"}
        </button>
      </form>

      <div className="relative mt-8 grid gap-3 rounded-[1.75rem] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-gray-400">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <span>Ingest product metadata</span>
          <span className="rounded-full bg-white/8 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gray-300">API</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <span>Collect review and offer signals</span>
          <span className="rounded-full bg-white/8 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gray-300">Crawler</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <span>Score and explain the result</span>
          <span className="rounded-full bg-white/8 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gray-300">Engine</span>
        </div>
      </div>
    </div>
  );
}
