import { DEFAULT_SCORING_RULES, type DimensionKey, type ScoringRules } from "./scoring-rules.ts";
import type {
  CollectedOffer,
  CollectedReviewSnippet,
  LowestPriceResult,
  OfferEntity,
  ProductEntity,
  ProductScoreResult,
  ProductScoringInput,
  ReviewSnippetEntity,
  ScoreExplanationPart
} from "../types/entities.ts";

type NormalizedReview = {
  sourceSite: string;
  text: string;
  rating: number | null;
  qualityTags: string[];
  confidenceScore: number;
};

type NormalizedOffer = {
  sourceSite: string;
  offerUrl: string | null;
  currency: string | null;
  price: number | null;
  shipping: number | null;
  totalPrice: number | null;
  observedAt: string | null;
};

type DimensionSignals = {
  positive: number;
  negative: number;
  detailedEvidence: number;
  relevant: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number) {
  return Math.round(clamp(value, 0, 100));
}

function normalizeWhitespace(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value: string | null | undefined) {
  return normalizeWhitespace(value).toLowerCase();
}

function countWords(value: string) {
  return normalizeWhitespace(value).split(" ").filter(Boolean).length;
}

function parseMoney(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return normalized ? Number(normalized[0]) : null;
}

function getTextCorpus(product: Partial<ProductEntity>) {
  return [
    normalizeText(product.title),
    normalizeText(product.normalizedTitle),
    normalizeText(product.description),
    normalizeText(product.normalizedCategory),
    normalizeText(product.normalizedBrand)
  ]
    .filter(Boolean)
    .join(" ");
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function countMatches(text: string, terms: string[]) {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
}

function normalizeReview(review: ReviewSnippetEntity | CollectedReviewSnippet): NormalizedReview {
  return {
    sourceSite: review.sourceSite ?? "unknown",
    text: normalizeText(review.reviewText),
    rating: review.ratingValue ?? null,
    qualityTags: review.qualityTags.map((tag) => tag.toLowerCase()),
    confidenceScore: review.confidenceScore ?? 0.6
  };
}

function normalizeOffer(offer: OfferEntity | CollectedOffer): NormalizedOffer {
  const total = parseMoney(offer.totalPrice);
  const price = parseMoney(offer.price);
  const shipping = parseMoney(offer.shipping);

  return {
    sourceSite: offer.sourceSite,
    offerUrl: offer.offerUrl,
    currency: offer.currency,
    price,
    shipping,
    totalPrice: total ?? (price !== null ? price + (shipping ?? 0) : null),
    observedAt: "collectedAt" in offer ? offer.collectedAt : offer.observedAt
  };
}

function computeLowestPrice(offers: NormalizedOffer[]): LowestPriceResult {
  const candidates = offers.filter((offer) => offer.totalPrice !== null);

  if (candidates.length === 0) {
    return {
      amount: null,
      currency: null,
      sourceSite: null,
      offerUrl: null,
      observedAt: null
    };
  }

  const lowest = [...candidates].sort((left, right) => (left.totalPrice ?? Infinity) - (right.totalPrice ?? Infinity))[0];

  return {
    amount: lowest.totalPrice,
    currency: lowest.currency,
    sourceSite: lowest.sourceSite,
    offerUrl: lowest.offerUrl,
    observedAt: lowest.observedAt
  };
}

function computeAverageRating(reviews: NormalizedReview[]) {
  const ratings = reviews.map((review) => review.rating).filter((rating): rating is number => rating !== null);

  if (ratings.length === 0) {
    return null;
  }

  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}

function dimensionRelevant(dimension: DimensionKey, productText: string, reviews: NormalizedReview[], rules: ScoringRules) {
  const relevantTerms = rules.keywordSets[`${dimension}Relevant`];
  if (containsAny(productText, relevantTerms)) {
    return true;
  }

  return reviews.some((review) => containsAny(review.text, relevantTerms) || review.qualityTags.some((tag) => relevantTerms.includes(tag)));
}

function collectDimensionSignals(
  dimension: DimensionKey,
  reviews: NormalizedReview[],
  productText: string,
  rules: ScoringRules
): DimensionSignals {
  const positiveTerms = rules.keywordSets[`${dimension}Positive`];
  const negativeTerms = rules.keywordSets[`${dimension}Negative`];
  const relevant = dimensionRelevant(dimension, productText, reviews, rules);

  let positive = 0;
  let negative = 0;
  let detailedEvidence = 0;

  for (const review of reviews) {
    const positiveMatches = countMatches(review.text, positiveTerms) + review.qualityTags.filter((tag) => positiveTerms.includes(tag)).length;
    const negativeMatches = countMatches(review.text, negativeTerms) + review.qualityTags.filter((tag) => negativeTerms.includes(tag)).length;

    if (positiveMatches > 0) {
      positive += positiveMatches;
      if (countWords(review.text) >= rules.detailThresholds.detailedReviewWords) {
        detailedEvidence += 1;
      }
    }

    if (negativeMatches > 0) {
      negative += negativeMatches;
      if (countWords(review.text) >= rules.detailThresholds.detailedReviewWords) {
        detailedEvidence += 1;
      }
    }
  }

  return { positive, negative, detailedEvidence, relevant };
}

function scoreDimension(signals: DimensionSignals) {
  if (!signals.relevant) {
    return null;
  }

  const evidence = signals.positive + signals.negative;
  if (evidence === 0) {
    return 50;
  }

  const ratio = (signals.positive - signals.negative) / evidence;
  const detailBoost = Math.min(8, signals.detailedEvidence * 2);
  const negativePenalty = signals.negative * 4;
  return roundScore(55 + ratio * 28 + detailBoost - negativePenalty);
}

function ratingContribution(review: NormalizedReview, rules: ScoringRules) {
  if (review.rating === null) {
    return 0;
  }

  const normalized = clamp((review.rating - 3) / 2, -1, 1);
  return normalized * rules.evidenceWeights.ratingWeight * review.confidenceScore;
}

function reviewEvidenceContribution(reviews: NormalizedReview[], rules: ScoringRules) {
  let total = 0;

  for (const review of reviews) {
    const detailBonus =
      countWords(review.text) >= rules.detailThresholds.detailedReviewWords
        ? rules.evidenceWeights.detailedReviewBonus
        : 0;

    total += rules.evidenceWeights.reviewBase * review.confidenceScore;
    total += detailBonus;
    total += ratingContribution(review, rules);
    total += countMatches(review.text, rules.keywordSets.trustPositive) * 1.5;
    total -= countMatches(review.text, rules.keywordSets.trustNegative) * 2.2;
  }

  return total;
}

function sourceDiversityContribution(reviews: NormalizedReview[], offers: NormalizedOffer[], rules: ScoringRules) {
  const reviewSources = new Set(reviews.map((review) => review.sourceSite));
  const offerSources = new Set(offers.map((offer) => offer.sourceSite));
  const independentSources = new Set([...reviewSources, ...offerSources]).size;
  return independentSources * rules.evidenceWeights.independentSourceBonus;
}

function metadataCompletenessContribution(product: Partial<ProductEntity>, rules: ScoringRules) {
  const fields = [product.title, product.brand, product.description, product.imageUrl ?? null];
  const filled = fields.filter((value) => Boolean(normalizeWhitespace(value))).length;
  return (filled / fields.length) * rules.evidenceWeights.metadataCompletenessBonus;
}

function offerCoverageContribution(offers: NormalizedOffer[], rules: ScoringRules) {
  if (offers.length === 0) {
    return 0;
  }

  const validOffers = offers.filter((offer) => offer.totalPrice !== null);
  return Math.min(rules.evidenceWeights.offerCoverageBonus, validOffers.length * 2.5);
}

function reviewConsensusContribution(reviews: NormalizedReview[]) {
  const ratings = reviews.map((review) => review.rating).filter((rating): rating is number => rating !== null);

  if (ratings.length < 2) {
    return 0;
  }

  const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  const variance = ratings.reduce((sum, rating) => sum + (rating - average) ** 2, 0) / ratings.length;
  const deviation = Math.sqrt(variance);

  if (deviation <= 0.35 && average >= 4) {
    return 8;
  }

  if (deviation <= 0.7 && average >= 3.6) {
    return 4;
  }

  if (deviation >= 1.3) {
    return -6;
  }

  return 0;
}

function offerConsistencyContribution(offers: NormalizedOffer[]) {
  const totals = offers.map((offer) => offer.totalPrice).filter((price): price is number => price !== null);

  if (totals.length < 2) {
    return 0;
  }

  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const spreadRatio = min > 0 ? (max - min) / min : 0;

  if (spreadRatio <= 0.1) {
    return 4;
  }

  if (spreadRatio >= 0.4) {
    return -4;
  }

  return 0;
}

function detectConflictPenalty(
  reviews: NormalizedReview[],
  dimensions: Record<DimensionKey, DimensionSignals>,
  rules: ScoringRules
) {
  let penalty = 0;
  let conflictingDimensions = 0;

  for (const signals of Object.values(dimensions)) {
    if (signals.positive > 0 && signals.negative > 0) {
      penalty += rules.evidenceWeights.conflictPenalty;
      conflictingDimensions += 1;
    }
  }

  const ratings = reviews.map((review) => review.rating).filter((rating): rating is number => rating !== null);
  if (ratings.length >= 3) {
    const min = Math.min(...ratings);
    const max = Math.max(...ratings);
    if (max - min >= 2) {
      penalty += rules.evidenceWeights.conflictPenalty / 2;
    }
  }

  if (ratings.length > 0) {
    const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    if (conflictingDimensions > 0 && averageRating < 3.4) {
      penalty += rules.evidenceWeights.conflictPenalty / 1.5;
    }
  }

  return penalty;
}

function averageRatingPenalty(reviews: NormalizedReview[]) {
  const averageRating = computeAverageRating(reviews);

  if (averageRating === null) {
    return 0;
  }

  if (averageRating >= 4) {
    return 0;
  }

  if (averageRating >= 3.5) {
    return 4;
  }

  if (averageRating >= 3) {
    return 8;
  }

  return 12;
}

function confidenceFromEvidence(
  product: Partial<ProductEntity>,
  reviews: NormalizedReview[],
  offers: NormalizedOffer[],
  rules: ScoringRules
) {
  const sourceCount = new Set([...reviews.map((review) => review.sourceSite), ...offers.map((offer) => offer.sourceSite)]).size;
  const metadataFields = [product.title, product.brand, product.description, product.imageUrl ?? null].filter(Boolean).length;
  const consensusContribution = reviewConsensusContribution(reviews);
  const offerContribution = offerConsistencyContribution(offers);
  const conflictPenalty = detectConflictPenalty(
    reviews,
    {
      fit: collectDimensionSignals("fit", reviews, getTextCorpus(product), rules),
      color: collectDimensionSignals("color", reviews, getTextCorpus(product), rules),
      material: collectDimensionSignals("material", reviews, getTextCorpus(product), rules)
    },
    rules
  );

  let score = 18;
  score += Math.min(28, reviews.length * 5);
  score += Math.min(18, offers.length * 4);
  score += Math.min(18, sourceCount * 6);
  score += metadataFields * 4;
  score += Math.max(-6, consensusContribution);
  score += Math.max(-4, offerContribution);

  if (sourceCount < rules.detailThresholds.strongSourceCount) {
    score -= rules.evidenceWeights.lowEvidencePenalty;
  }

  if (reviews.length === 0) {
    score -= rules.evidenceWeights.lowEvidencePenalty;
  }

  if (offers.length === 0) {
    score -= Math.round(rules.evidenceWeights.lowEvidencePenalty / 2);
  }

  score -= Math.min(18, conflictPenalty);

  return roundScore(score);
}

function buildExplanation(
  overallTrustScore: number,
  confidenceScore: number,
  dimensions: Record<DimensionKey, number | null>,
  lowestPrice: LowestPriceResult,
  breakdown: ScoreExplanationPart[]
) {
  const strongest = [...breakdown].sort((left, right) => Math.abs(right.impact) - Math.abs(left.impact)).slice(0, 3);
  const parts = [
    `Trust score ${overallTrustScore}/100 with ${confidenceScore}/100 confidence.`,
    strongest.map((item) => item.reason).join(" "),
    dimensions.fit !== null ? `Fit/quality score: ${dimensions.fit}/100.` : null,
    dimensions.color !== null ? `Color accuracy score: ${dimensions.color}/100.` : null,
    dimensions.material !== null ? `Material/fabric score: ${dimensions.material}/100.` : null,
    lowestPrice.amount !== null && lowestPrice.sourceSite
      ? `Lowest observed price: ${lowestPrice.amount.toFixed(2)} ${lowestPrice.currency ?? ""} at ${lowestPrice.sourceSite}.`
      : "No reliable lowest-price evidence yet."
  ]
    .filter(Boolean)
    .join(" ");

  return parts.replace(/\s+/g, " ").trim();
}

export function scoreProduct(
  input: ProductScoringInput,
  rules: ScoringRules = DEFAULT_SCORING_RULES
): ProductScoreResult {
  const product = input.product as Partial<ProductEntity>;
  const reviews = input.reviewSnippets.map(normalizeReview);
  const offers = input.offers.map(normalizeOffer);
  const productText = getTextCorpus(product);

  const dimensionSignals = {
    fit: collectDimensionSignals("fit", reviews, productText, rules),
    color: collectDimensionSignals("color", reviews, productText, rules),
    material: collectDimensionSignals("material", reviews, productText, rules)
  } satisfies Record<DimensionKey, DimensionSignals>;

  const breakdown: ScoreExplanationPart[] = [];

  const reviewContribution = reviewEvidenceContribution(reviews, rules);
  breakdown.push({
    label: "review-evidence",
    impact: Math.round(reviewContribution),
    reason:
      reviews.length > 0
        ? `Detailed user reviews contributed positively across ${new Set(reviews.map((review) => review.sourceSite)).size} sources.`
        : "No user review evidence was available, which limits trust."
  });

  const diversityContribution = sourceDiversityContribution(reviews, offers, rules);
  breakdown.push({
    label: "source-diversity",
    impact: Math.round(diversityContribution),
    reason:
      diversityContribution > 0
        ? "Multiple independent sources improved the score."
        : "Independent-source coverage was limited."
  });

  const metadataContribution = metadataCompletenessContribution(product, rules);
  breakdown.push({
    label: "metadata",
    impact: Math.round(metadataContribution),
    reason:
      metadataContribution > 0
        ? "Product metadata was reasonably complete."
        : "Sparse product metadata reduced certainty."
  });

  const offerContribution = offerCoverageContribution(offers, rules);
  breakdown.push({
    label: "offers",
    impact: Math.round(offerContribution),
    reason:
      offers.length > 0
        ? "Offer coverage added commercial evidence for pricing consistency."
        : "No offer evidence was available."
  });

  const reviewConsensus = reviewConsensusContribution(reviews);
  if (reviewConsensus !== 0) {
    breakdown.push({
      label: "review-consensus",
      impact: reviewConsensus,
      reason:
        reviewConsensus > 0
          ? "Reviews were directionally consistent, which improved trust."
          : "Review sentiment was inconsistent, which weakened trust."
    });
  }

  const offerConsistency = offerConsistencyContribution(offers);
  if (offerConsistency !== 0) {
    breakdown.push({
      label: "offer-consistency",
      impact: offerConsistency,
      reason:
        offerConsistency > 0
          ? "Comparable offers were priced in a tight range."
          : "Offer pricing varied widely across sites."
    });
  }

  const conflictPenalty = detectConflictPenalty(reviews, dimensionSignals, rules);
  if (conflictPenalty > 0) {
    breakdown.push({
      label: "conflict",
      impact: -Math.round(conflictPenalty),
      reason: "Conflicting signals across reviews reduced the trust score."
    });
  }

  const ratingPenalty = averageRatingPenalty(reviews);
  if (ratingPenalty > 0) {
    breakdown.push({
      label: "rating-drag",
      impact: -ratingPenalty,
      reason: "Lower average ratings pulled the trust score down."
    });
  }

  let overall =
    rules.baseScore +
    reviewContribution +
    diversityContribution +
    metadataContribution +
    offerContribution +
    reviewConsensus +
    offerConsistency -
    conflictPenalty -
    ratingPenalty;

  if (reviews.length === 0 && offers.length === 0) {
    overall -= rules.evidenceWeights.lowEvidencePenalty * 1.5;
  } else if (reviews.length === 0) {
    overall -= rules.evidenceWeights.lowEvidencePenalty;
  }

  const overallTrustScore = roundScore(overall);
  const fitQualityScore = scoreDimension(dimensionSignals.fit);
  const colorAccuracyScore = scoreDimension(dimensionSignals.color);
  const materialFabricScore = scoreDimension(dimensionSignals.material);
  const confidenceScore = confidenceFromEvidence(product, reviews, offers, rules);
  const lowestPrice = computeLowestPrice(offers);
  const explanation = buildExplanation(
    overallTrustScore,
    confidenceScore,
    {
      fit: fitQualityScore,
      color: colorAccuracyScore,
      material: materialFabricScore
    },
    lowestPrice,
    breakdown
  );

  return {
    overallTrustScore,
    fitQualityScore,
    colorAccuracyScore,
    materialFabricScore,
    confidenceScore,
    lowestPrice,
    explanation,
    breakdown
  };
}
