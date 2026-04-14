import { EvidenceCard } from "@/components/results/evidence-card";
import { ScoreGauge } from "@/components/results/score-gauge";
import { Card } from "@/components/ui/card";
import { extractHostname } from "@/lib/utils";
import type { CollectedOffer, CollectedReviewSnippet, ResultsViewModel } from "@/types";

type ResultsDashboardProps = {
  data: ResultsViewModel;
  warning?: string | null;
};

function formatCurrency(amount: number | null, _currency?: string | null) {
  if (amount === null) {
    return "N/A";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function confidenceLabel(value: number) {
  if (value >= 80) {
    return "High confidence";
  }

  if (value >= 60) {
    return "Moderate confidence";
  }

  return "Low confidence";
}

function scoreLabel(value: number) {
  if (value >= 80) {
    return "Looks strong";
  }

  if (value >= 60) {
    return "Worth a closer look";
  }

  return "Proceed carefully";
}

function stripPriceSentence(text: string) {
  return text
    .replace(/lowest observed price:[^.]+\./i, "")
    .replace(/trust score \d+\/100 with \d+\/100 confidence\./i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readIdentityConfidence(metadata: Record<string, unknown> | null) {
  if (!metadata || typeof metadata.identityConfidence !== "number") {
    return null;
  }

  return metadata.identityConfidence;
}

function buildShortSummary(
  explanation: string,
  reviewCount: number,
  offerCount: number,
  score: number,
  confidence: number,
  identityConfidence: number | null
) {
  const trimmedExplanation = stripPriceSentence(explanation);
  const intro = score >= 80 ? "Signals point to a strong product match." : score >= 60 ? "Signals look reasonably solid for this item." : "Live evidence is mixed for this item.";
  const evidence =
    reviewCount > 0 || offerCount > 0
      ? `We found ${reviewCount} review ${reviewCount === 1 ? "signal" : "signals"} and ${offerCount} live ${offerCount === 1 ? "offer" : "offers"}.`
      : "Live evidence was limited, so the result should be treated cautiously.";
  const confidenceLine = confidence >= 80 ? "Confidence is high." : confidence >= 60 ? "Confidence is moderate." : "Confidence is limited.";
  const identityLine =
    identityConfidence === null
      ? null
      : identityConfidence >= 0.8
        ? "We identified the exact product cleanly from page metadata."
        : identityConfidence >= 0.55
          ? "Product identity looks plausible but not perfectly locked."
          : "We could not confidently identify the exact item, so matching confidence is lower.";

  return [intro, identityLine, confidenceLine, evidence, trimmedExplanation].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function pickTopReviews(reviews: CollectedReviewSnippet[]) {
  return [...reviews]
    .sort((left, right) => {
      const leftScore = (left.confidenceScore ?? 0) + (left.ratingValue ?? 0) / 10 + left.qualityTags.length * 0.02;
      const rightScore = (right.confidenceScore ?? 0) + (right.ratingValue ?? 0) / 10 + right.qualityTags.length * 0.02;
      return rightScore - leftScore;
    })
    .slice(0, 3);
}

function pickTopOffers(offers: CollectedOffer[]) {
  return [...offers]
    .sort((left, right) => {
      const leftPrice = left.totalPrice ? Number(left.totalPrice) : Number.POSITIVE_INFINITY;
      const rightPrice = right.totalPrice ? Number(right.totalPrice) : Number.POSITIVE_INFINITY;
      return leftPrice - rightPrice;
    })
    .slice(0, 3);
}

function conciseReviewText(review: CollectedReviewSnippet) {
  const text = review.reviewText.replace(/\s+/g, " ").trim();
  if (text.length <= 180) {
    return text;
  }

  return `${text.slice(0, 177).trim()}...`;
}

function scoreTone(value: number) {
  if (value >= 80) {
    return "border-sky-300/20 bg-sky-300/10 text-sky-100";
  }

  if (value >= 60) {
    return "border-amber-300/20 bg-amber-300/10 text-amber-100";
  }

  return "border-rose-300/20 bg-rose-300/10 text-rose-100";
}

export function ResultsDashboard({ data, warning }: ResultsDashboardProps) {
  const { product, reviewSnippets, offers, score } = data;
  const identityConfidence = readIdentityConfidence(product.metadata);
  const sourceHost = extractHostname(product.originalUrl);
  const topReviews = pickTopReviews(reviewSnippets);
  const topOffers = pickTopOffers(offers);
  const summary = buildShortSummary(
    score.explanation,
    reviewSnippets.length,
    offers.length,
    score.overallTrustScore,
    score.confidenceScore,
    identityConfidence
  );
  const usefulTags = [...new Set(reviewSnippets.flatMap((review) => review.qualityTags))].slice(0, 6);
  const scoreHighlights = [
    { label: "Score", value: scoreLabel(score.overallTrustScore) },
    { label: "Confidence", value: confidenceLabel(score.confidenceScore) },
    {
      label: "Best live price",
      value:
        score.lowestPrice.amount !== null
          ? `${formatCurrency(score.lowestPrice.amount)} at ${score.lowestPrice.sourceSite ?? "a retailer"}`
          : "No dependable price found yet"
    }
  ];

  return (
    <div className="space-y-5">
      {warning ? (
        <div className="rounded-[18px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-100">
          {warning}
        </div>
      ) : null}

      <Card className="relative overflow-hidden px-5 py-5 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[38%] bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.12),transparent_68%)]" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_280px]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-300">
                Live result
              </span>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${scoreTone(score.overallTrustScore)}`}>
                {scoreLabel(score.overallTrustScore)}
              </span>
              {identityConfidence !== null && identityConfidence < 0.55 ? (
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                  Identity uncertain
                </span>
              ) : null}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                <span>{product.brand ?? "Unknown brand"}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-gray-300">{sourceHost}</span>
              </div>
              <h1 className="mt-3 max-w-3xl text-[2.15rem] font-semibold tracking-[-0.065em] text-white sm:text-[3rem]">
                {product.title ?? product.normalizedTitle ?? "Untitled product"}
              </h1>
              <p className="mt-4 max-w-3xl text-[15px] leading-7 text-gray-300">{summary}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {scoreHighlights.map((item) => (
                <div key={item.label} className="rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">{item.label}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-white">{item.value}</p>
                </div>
              ))}
            </div>

            {usefulTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {usefulTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-gray-200">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative grid gap-3 self-start">
            <ScoreGauge label="Product score" value={score.overallTrustScore} />
            <ScoreGauge label="Confidence" value={score.confidenceScore} tone="muted" />
            <Card className="overflow-hidden p-0">
              {product.image ? (
                <img src={product.image} alt={product.title ?? "Product image"} className="aspect-[4/3] h-full w-full object-cover" />
              ) : (
                <div className="grid aspect-[4/3] place-items-center bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.16),transparent_60%)] p-6 text-center">
                  <div>
                    <p className="text-[15px] font-semibold text-white">No product image</p>
                    <p className="mt-2 text-sm text-gray-400">The analysis still uses pricing and review signals.</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <EvidenceCard title="Best live offer" eyebrow="Price">
          {score.lowestPrice.amount !== null ? (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Lowest price found</p>
                <p className="mt-2 text-[2rem] font-semibold tracking-[-0.06em] text-white">
                  {formatCurrency(score.lowestPrice.amount)}
                </p>
                <p className="mt-2 text-sm text-gray-300">{score.lowestPrice.sourceSite ?? "Retailer unavailable"}</p>
              </div>
              {score.lowestPrice.offerUrl ? (
                <a
                  href={score.lowestPrice.offerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.07] active:translate-y-px"
                >
                  View offer
                </a>
              ) : null}
            </div>
          ) : (
            <p className="text-sm leading-7 text-gray-400">We didn’t find a dependable live offer yet, so price confidence stays limited.</p>
          )}
        </EvidenceCard>

        <EvidenceCard title="Why it landed here" eyebrow="Summary">
          <p className="text-sm leading-7 text-gray-300">{stripPriceSentence(score.explanation) || "Live evidence was limited, so this score leans more cautious."}</p>
        </EvidenceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <EvidenceCard title="What shoppers are saying" eyebrow="Evidence">
          <div className="space-y-3">
            {topReviews.length > 0 ? (
              topReviews.map((review, index) => (
                <div
                  key={`${review.sourceUrl}-${index}`}
                  className="rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-4 transition duration-200 hover:border-white/14 hover:bg-white/[0.05]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{review.reviewTitle ?? "Review signal"}</p>
                      <p className="mt-1 text-[12px] text-gray-500">{review.sourceSite}</p>
                    </div>
                    {review.ratingValue !== null ? (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-gray-200">
                        {review.ratingValue.toFixed(1)}/5
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-gray-300">{conciseReviewText(review)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-gray-400">No useful shopper commentary was extracted for this item yet.</p>
            )}
          </div>
        </EvidenceCard>

        <EvidenceCard title="Nearby offers" eyebrow="Market">
          <div className="space-y-3">
            {topOffers.length > 0 ? (
              topOffers.map((offer, index) => (
                <div
                  key={`${offer.offerUrl}-${index}`}
                  className="rounded-[18px] border border-white/10 bg-white/[0.035] px-4 py-4 transition duration-200 hover:border-white/14 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{offer.merchantName ?? offer.sourceSite}</p>
                      <p className="mt-1 text-[12px] text-gray-500">{offer.sourceSite}</p>
                    </div>
                    <p className="text-lg font-semibold tracking-[-0.04em] text-white">
                      {offer.totalPrice ? formatCurrency(Number(offer.totalPrice)) : "N/A"}
                    </p>
                  </div>
                  <p className="mt-2 text-[12px] leading-6 text-gray-400">
                    {offer.price ? `Item ${formatCurrency(Number(offer.price))}` : "Price unavailable"}
                    {offer.shipping ? ` · Shipping ${formatCurrency(Number(offer.shipping), offer.currency)}` : ""}
                    {offer.availability ? ` · ${offer.availability}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-gray-400">Live store pricing was limited for this product.</p>
            )}
          </div>
        </EvidenceCard>
      </section>
    </div>
  );
}
