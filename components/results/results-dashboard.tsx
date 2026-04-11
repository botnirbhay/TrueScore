import { EvidenceCard } from "@/components/results/evidence-card";
import { ScoreGauge } from "@/components/results/score-gauge";
import type { ResultsViewModel } from "@/types";

type ResultsDashboardProps = {
  data: ResultsViewModel;
  warning?: string | null;
};

function badgeTone(value: number) {
  if (value >= 75) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (value >= 55) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-red-50 text-red-700";
}

export function ResultsDashboard({ data, warning }: ResultsDashboardProps) {
  const { product, reviewSnippets, offers, score } = data;
  const breakdownScores = [
    { label: "Fit / Quality", value: score.fitQualityScore },
    { label: "Color Accuracy", value: score.colorAccuracyScore },
    { label: "Material / Fabric", value: score.materialFabricScore }
  ].filter((item) => item.value !== null) as Array<{ label: string; value: number }>;
  const qualityMentions = [...new Set(reviewSnippets.flatMap((review) => review.qualityTags))].slice(0, 10);

  return (
    <div className="space-y-6">
      {warning ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {warning}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-border bg-panel/95 p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/55">
            Product Results
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone(score.overallTrustScore)}`}>
            Trust Score {score.overallTrustScore}/100
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="overflow-hidden rounded-[1.75rem] border border-border bg-white">
            {product.image ? (
              <img src={product.image} alt={product.title ?? "Product image"} className="aspect-square h-full w-full object-cover" />
            ) : (
              <div className="grid aspect-square place-items-center bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.14),_transparent_60%)] p-6 text-center">
                <div>
                  <p className="font-heading text-lg font-semibold">No image available</p>
                  <p className="mt-2 text-sm text-foreground/60">Metadata loaded without a reliable product image.</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-foreground/45">{product.brand ?? "Unknown brand"}</p>
              <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                {product.title ?? product.normalizedTitle ?? "Untitled product"}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-foreground/70">
                {product.description ?? "No detailed description is available yet."}
              </p>
              <a
                href={product.originalUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex break-all text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                {product.originalUrl}
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ScoreGauge label="Overall Trust" value={score.overallTrustScore} />
              <ScoreGauge label="Confidence" value={score.confidenceScore} tone="muted" />
              <div className="rounded-3xl border border-border bg-white p-5 shadow-card">
                <p className="text-sm font-medium text-foreground/55">Lowest Price</p>
                <p className="mt-3 font-heading text-3xl font-semibold tracking-tight">
                  {score.lowestPrice.amount !== null ? `$${score.lowestPrice.amount.toFixed(2)}` : "N/A"}
                </p>
                <p className="mt-2 text-sm text-foreground/65">{score.lowestPrice.sourceSite ?? "No pricing signal yet"}</p>
              </div>
              <div className="rounded-3xl border border-border bg-white p-5 shadow-card">
                <p className="text-sm font-medium text-foreground/55">Evidence Coverage</p>
                <p className="mt-3 font-heading text-3xl font-semibold tracking-tight">{reviewSnippets.length + offers.length}</p>
                <p className="mt-2 text-sm text-foreground/65">
                  {reviewSnippets.length} reviews, {offers.length} offers
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <EvidenceCard title="Score Breakdown" eyebrow="Scoring">
          <div className="grid gap-3 sm:grid-cols-2">
            {breakdownScores.length > 0 ? (
              breakdownScores.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-panel p-4">
                  <p className="text-sm font-medium text-foreground/55">{item.label}</p>
                  <p className="mt-2 font-heading text-2xl font-semibold tracking-tight">{item.value}/100</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-border bg-panel p-4 text-sm text-foreground/65">
                No category-specific breakdowns were relevant for this item.
              </div>
            )}
            <div className="rounded-2xl border border-border bg-panel p-4 sm:col-span-2">
              <p className="text-sm font-medium text-foreground/55">Why this score</p>
              <p className="mt-2 text-sm leading-7 text-foreground/75">{score.explanation}</p>
            </div>
          </div>
        </EvidenceCard>

        <EvidenceCard title="Quality Mentions" eyebrow="Signals">
          {qualityMentions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {qualityMentions.map((tag) => (
                <span key={tag} className="rounded-full border border-border bg-panel px-3 py-1 text-sm font-medium text-foreground/70">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-foreground/65">No quality-related mentions were extracted yet.</p>
          )}
        </EvidenceCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <EvidenceCard title="Review Evidence" eyebrow="Reviews">
          <div className="space-y-4">
            {reviewSnippets.map((review, index) => (
              <div key={`${review.sourceUrl}-${index}`} className="rounded-2xl border border-border bg-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-heading text-lg font-semibold">{review.reviewTitle ?? "Review snippet"}</p>
                    <p className="text-sm text-foreground/55">{review.sourceSite}</p>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-foreground/70">
                    {review.ratingValue !== null ? `${review.ratingValue}/5` : "No rating"}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-foreground/75">{review.reviewText}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {review.qualityTags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-foreground/65">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </EvidenceCard>

        <EvidenceCard title="Offer Evidence" eyebrow="Offers">
          <div className="space-y-4">
            {offers.map((offer, index) => (
              <div key={`${offer.offerUrl}-${index}`} className="rounded-2xl border border-border bg-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-lg font-semibold">{offer.merchantName ?? offer.sourceSite}</p>
                    <p className="text-sm text-foreground/55">{offer.sourceSite}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading text-2xl font-semibold tracking-tight">
                      {offer.totalPrice ? `$${Number(offer.totalPrice).toFixed(2)}` : "N/A"}
                    </p>
                    <p className="text-xs text-foreground/55">
                      Price {offer.price ? `$${Number(offer.price).toFixed(2)}` : "N/A"}
                      {offer.shipping ? ` + Shipping $${Number(offer.shipping).toFixed(2)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">Availability</p>
                    <p className="mt-2 text-sm font-medium text-foreground/75">{offer.availability ?? "Unknown"}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">Confidence</p>
                    <p className="mt-2 text-sm font-medium text-foreground/75">
                      {offer.confidenceScore !== null ? `${Math.round(offer.confidenceScore * 100)}%` : "N/A"}
                    </p>
                  </div>
                </div>
                <a
                  href={offer.offerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline"
                >
                  Open offer
                </a>
              </div>
            ))}
          </div>
        </EvidenceCard>
      </section>
    </div>
  );
}

