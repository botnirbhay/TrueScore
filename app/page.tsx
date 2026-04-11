import { UrlSubmissionForm } from "@/components/forms/url-submission-form";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="space-y-6">
          <div className="inline-flex rounded-full border border-border bg-panel/80 px-3 py-1 text-sm font-medium text-foreground/70 shadow-sm backdrop-blur">
            MVP landing page
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Turn any product URL into a scan-friendly trust snapshot.
            </h1>
            <p className="max-w-xl text-base leading-7 text-foreground/70 sm:text-lg">
              Submit a product page and open a dedicated results view with pricing signals, extracted evidence, and an explainable score layout that remains stable even when backend data is still partial.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-panel/90 p-4 shadow-card">
              <p className="text-sm font-medium text-foreground/60">Input</p>
              <p className="mt-2 font-heading text-lg font-semibold">Product URL</p>
            </div>
            <div className="rounded-2xl border border-border bg-panel/90 p-4 shadow-card">
              <p className="text-sm font-medium text-foreground/60">Output</p>
              <p className="mt-2 font-heading text-lg font-semibold">Trust summary</p>
            </div>
            <div className="rounded-2xl border border-border bg-panel/90 p-4 shadow-card">
              <p className="text-sm font-medium text-foreground/60">Fallback</p>
              <p className="mt-2 font-heading text-lg font-semibold">In-memory mock data</p>
            </div>
          </div>
        </div>

        <UrlSubmissionForm />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-border bg-white p-6 shadow-card lg:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/45">Results Experience</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight">Built for quick trust decisions</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-foreground/70">
            The dedicated results page highlights the product itself, the headline trust score, confidence, price coverage, evidence cards, and human-readable reasoning. It stays category-agnostic so the same layout works across apparel, electronics, home goods, and other catalog types.
          </p>
        </div>
        <div className="rounded-[2rem] border border-border bg-panel/95 p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/45">What You’ll See</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground/70">
            <li>Product image, title, brand, and original URL</li>
            <li>Overall trust score plus confidence and breakdowns</li>
            <li>Lowest observed price and site</li>
            <li>Evidence cards for reviews, ratings, mentions, and offers</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
