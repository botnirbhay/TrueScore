import { EvidenceCard } from "@/components/results/evidence-card";
import { ScoreGauge } from "@/components/results/score-gauge";
import { Card } from "@/components/ui/card";
import { extractHostname } from "@/lib/utils";
import type { ResultsViewModel } from "@/types";

type ResultsDashboardProps = {
  data: ResultsViewModel;
  warning?: string | null;
};

function badgeTone(value: number) {
  if (value >= 75) {
    return "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (value >= 55) {
    return "border border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border border-rose-400/20 bg-rose-400/10 text-rose-300";
}

export function ResultsDashboard({ data, warning }: ResultsDashboardProps) {
  const { product, reviewSnippets, offers, score } = data;
  const breakdownScores = [
    { label: "Fit / Quality", value: score.fitQualityScore },
    { label: "Color Accuracy", value: score.colorAccuracyScore },
    { label: "Material / Fabric", value: score.materialFabricScore }
  ].filter((item) => item.value !== null) as Array<{ label: string; value: number }>;
  const qualityMentions = [...new Set(reviewSnippets.flatMap((review) => review.qualityTags))].slice(0, 10);
  const sourceHost = extractHostname(product.originalUrl);

  return (
    <div className="space-y-6">
      {warning ? (
        <div className="rounded-[18px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-200">
          {warning}
        </div>
      ) : null}

      <Card className="px-5 py-5 sm:px-7 sm:py-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-300">
            Product Results
          </div>
          <div className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${badgeTone(score.overallTrustScore)}`}>
            Trust Score {score.overallTrustScore}/100
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black/20">
            {product.image ? (
              <img src={product.image} alt={product.title ?? "Product image"} className="aspect-square h-full w-full object-cover" />
            ) : (
              <div className="grid aspect-square place-items-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_60%)] p-6 text-center">
                <div>
                  <p className="text-base font-semibold text-white">No image available</p>
                  <p className="mt-2 text-sm text-gray-400">Metadata loaded without a reliable product image.</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                <span>{product.brand ?? "Unknown brand"}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-gray-300">{sourceHost}</span>
              </div>
              <h1 className="mt-3 text-[1.9rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.35rem]">
                {product.title ?? product.normalizedTitle ?? "Untitled product"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-400">
                {product.description ?? "No detailed description is available yet."}
              </p>
              <a
                href={product.originalUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex break-all text-sm font-medium text-sky-300 underline-offset-4 hover:text-sky-200 hover:underline"
              >
                {product.originalUrl}
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ScoreGauge label="Overall Trust" value={score.overallTrustScore} />
              <ScoreGauge label="Confidence" value={score.confidenceScore} tone="muted" />
              <Card className="px-4 py-4">
                <p className="text-[13px] font-medium text-gray-400">Lowest Price</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                  {score.lowestPrice.amount !== null ? `$${score.lowestPrice.amount.toFixed(2)}` : "N/A"}
                </p>
                <p className="mt-2 text-sm text-gray-400">{score.lowestPrice.sourceSite ?? "No pricing signal yet"}</p>
              </Card>
              <Card className="px-4 py-4">
                <p className="text-[13px] font-medium text-gray-400">Evidence Coverage</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{reviewSnippets.length + offers.length}</p>
                <p className="mt-2 text-sm text-gray-400">
                  {reviewSnippets.length} reviews, {offers.length} offers
                </p>
              </Card>
            </div>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <EvidenceCard title="Score Breakdown" eyebrow="Scoring">
          <div className="grid gap-3 sm:grid-cols-2">
            {breakdownScores.length > 0 ? (
              breakdownScores.map((item) => (
                <div key={item.label} className="rounded-[16px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[13px] font-medium text-gray-400">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{item.value}/100</p>
                </div>
              ))
            ) : (
              <div className="rounded-[16px] border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                No category-specific breakdowns were relevant for this item.
              </div>
            )}
            <div className="rounded-[16px] border border-white/10 bg-black/20 p-4 sm:col-span-2">
              <p className="text-[13px] font-medium text-gray-400">Why this score</p>
              <p className="mt-2 text-sm leading-7 text-gray-300">{score.explanation}</p>
            </div>
          </div>
        </EvidenceCard>

        <EvidenceCard title="Quality Mentions" eyebrow="Signals">
          {qualityMentions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {qualityMentions.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-medium text-gray-300">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-gray-400">No quality-related mentions were extracted yet.</p>
          )}
        </EvidenceCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <EvidenceCard title="Review Evidence" eyebrow="Reviews">
          <div className="space-y-4">
            {reviewSnippets.length > 0 ? (
              reviewSnippets.map((review, index) => (
                <div key={`${review.sourceUrl}-${index}`} className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{review.reviewTitle ?? "Review snippet"}</p>
                      <p className="text-sm text-gray-500">{review.sourceSite}</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-semibold text-gray-200">
                      {review.ratingValue !== null ? `${review.ratingValue}/5` : "No rating"}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-gray-300">{review.reviewText}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {review.qualityTags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                No review evidence was captured for this product yet.
              </div>
            )}
          </div>
        </EvidenceCard>

        <EvidenceCard title="Offer Evidence" eyebrow="Offers">
          <div className="space-y-4">
            {offers.length > 0 ? (
              offers.map((offer, index) => (
                <div key={`${offer.offerUrl}-${index}`} className="rounded-[18px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{offer.merchantName ?? offer.sourceSite}</p>
                      <p className="text-sm text-gray-500">{offer.sourceSite}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold tracking-[-0.04em] text-white">
                        {offer.totalPrice ? `$${Number(offer.totalPrice).toFixed(2)}` : "N/A"}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Price {offer.price ? `$${Number(offer.price).toFixed(2)}` : "N/A"}
                        {offer.shipping ? ` + Shipping $${Number(offer.shipping).toFixed(2)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[14px] border border-white/8 bg-white/[0.04] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Availability</p>
                      <p className="mt-2 text-sm font-medium text-gray-200">{offer.availability ?? "Unknown"}</p>
                    </div>
                    <div className="rounded-[14px] border border-white/8 bg-white/[0.04] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Confidence</p>
                      <p className="mt-2 text-sm font-medium text-gray-200">
                        {offer.confidenceScore !== null ? `${Math.round(offer.confidenceScore * 100)}%` : "N/A"}
                      </p>
                    </div>
                  </div>
                  <a
                    href={offer.offerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex text-sm font-medium text-sky-300 underline-offset-4 hover:text-sky-200 hover:underline"
                  >
                    Open offer
                  </a>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                No offer evidence was captured for this product yet.
              </div>
            )}
          </div>
        </EvidenceCard>
      </section>
    </div>
  );
}
