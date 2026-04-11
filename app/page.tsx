import { UrlSubmissionForm } from "@/components/forms/url-submission-form";

export default function HomePage() {
  return (
    <div className="space-y-10 pb-8 sm:space-y-14">
      <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
        <div className="space-y-8 pt-4 sm:pt-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-gray-300 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_16px_rgba(45,212,191,0.8)]" />
            Premium trust scoring for product URLs
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl font-heading text-5xl font-bold tracking-tight text-white text-balance sm:text-6xl lg:text-7xl">
              Know what you&apos;re really buying.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-gray-400 sm:text-lg">
              Paste any public product page. TrueScore ingests the listing, collects review and pricing evidence, then turns
              noisy signals into a clean trust readout you can scan in seconds.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 shadow-card backdrop-blur">
              <p className="text-sm font-medium text-gray-400">Input</p>
              <p className="mt-2 font-heading text-lg font-semibold text-white">Product URL</p>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 shadow-card backdrop-blur">
              <p className="text-sm font-medium text-gray-400">Output</p>
              <p className="mt-2 font-heading text-lg font-semibold text-white">Evidence-backed score</p>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 shadow-card backdrop-blur">
              <p className="text-sm font-medium text-gray-400">Reliability</p>
              <p className="mt-2 font-heading text-lg font-semibold text-white">Graceful fallbacks</p>
            </div>
          </div>
        </div>

        <UrlSubmissionForm />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-card backdrop-blur sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">Results experience</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-white">Built for fast, confident decisions</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-gray-400">
            The results view keeps the signal obvious: product identity, overall trust, confidence, lowest observed price,
            detailed evidence, and a plain-language explanation of how the score was formed. The layout stays category-agnostic,
            so it works just as well for home, electronics, beauty, or apparel.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">1</p>
              <p className="mt-3 text-sm font-medium text-white">Ingest public metadata</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">2</p>
              <p className="mt-3 text-sm font-medium text-white">Collect review and offer signals</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">3</p>
              <p className="mt-3 text-sm font-medium text-white">Score with clear reasoning</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/8 to-white/[0.03] p-6 shadow-card backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-500">What you&apos;ll see</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-300">
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
