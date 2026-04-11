export type CrawlStatus =
  | "PENDING"
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "PARTIAL"
  | "FAILED"
  | "SKIPPED";

export type CrawlTrigger = "MANUAL" | "SCHEDULED" | "REPROCESS";

export type SourcePageType = "PRODUCT_PAGE" | "REVIEW_PAGE" | "OFFER_PAGE" | "BRAND_PAGE" | "OTHER";

export type ScoreType = "OVERALL" | "QUALITY" | "VALUE" | "TRUST" | "REVIEW_SIGNAL";

export type ProductEntity = {
  id: string;
  originalUrl: string;
  canonicalUrl: string | null;
  slug: string | null;
  sourceSite: string | null;
  title: string | null;
  brand: string | null;
  imageUrl: string | null;
  normalizedBrand: string | null;
  normalizedTitle: string | null;
  normalizedSku: string | null;
  normalizedCategory: string | null;
  metadata: Record<string, unknown> | null;
  normalizedAttributes: Record<string, unknown> | null;
  description: string | null;
  qualityTags: string[];
  confidenceScore: number | null;
  crawlStatus: CrawlStatus;
  lastCrawledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductSourceEntity = {
  id: string;
  productId: string;
  sourceSite: string;
  sourceUrl: string;
  pageType: SourcePageType;
  externalId: string | null;
  sourceBrand: string | null;
  sourceTitle: string | null;
  sourceSku: string | null;
  sourceCategory: string | null;
  availability: string | null;
  rawPayload: Record<string, unknown> | null;
  extractedPayload: Record<string, unknown> | null;
  qualityTags: string[];
  confidenceScore: number | null;
  lastFetchedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewSnippetEntity = {
  id: string;
  productId: string;
  productSourceId: string | null;
  sourceSite: string | null;
  authorName: string | null;
  reviewTitle: string | null;
  reviewText: string;
  ratingValue: number | null;
  ratingScale: number | null;
  qualityTags: string[];
  sentimentLabel: string | null;
  confidenceScore: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OfferEntity = {
  id: string;
  productId: string;
  productSourceId: string | null;
  sourceSite: string;
  merchantName: string | null;
  offerUrl: string | null;
  sku: string | null;
  condition: string | null;
  availability: string | null;
  currency: string;
  price: string;
  shipping: string | null;
  totalPrice: string | null;
  qualityTags: string[];
  confidenceScore: number | null;
  isPrimary: boolean;
  observedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ScoreEntity = {
  id: string;
  productId: string;
  productSourceId: string | null;
  scoreType: ScoreType;
  sourceSite: string | null;
  value: number;
  confidenceScore: number | null;
  rationale: string | null;
  qualityTags: string[];
  createdAt: string;
  updatedAt: string;
};

export type CrawlJobEntity = {
  id: string;
  productId: string | null;
  productSourceId: string | null;
  originalUrl: string;
  sourceSite: string | null;
  status: CrawlStatus;
  triggerType: CrawlTrigger;
  attemptCount: number;
  maxAttempts: number;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CollectibleProductInput = {
  id?: string;
  originalUrl: string;
  title?: string | null;
  normalizedTitle?: string | null;
  brand?: string | null;
  normalizedBrand?: string | null;
  normalizedSku?: string | null;
  sourceSite?: string | null;
};

export type CollectorSourceType = "review" | "offer";

export type SourceSearchConfig = {
  key: string;
  label: string;
  domain: string;
  kind: CollectorSourceType;
  searchUrl: (query: string) => string;
  allowedPathPrefixes?: string[];
};

export type CollectedReviewSnippet = {
  sourceSite: string;
  sourceUrl: string;
  authorName: string | null;
  reviewTitle: string | null;
  reviewText: string;
  ratingValue: number | null;
  ratingScale: number | null;
  qualityTags: string[];
  confidenceScore: number | null;
  collectedAt: string;
};

export type CollectedOffer = {
  sourceSite: string;
  sourceUrl: string;
  merchantName: string | null;
  offerUrl: string;
  currency: string | null;
  price: string | null;
  shipping: string | null;
  totalPrice: string | null;
  availability: string | null;
  qualityTags: string[];
  confidenceScore: number | null;
  collectedAt: string;
};

export type CollectedSourcePage = {
  sourceKey: string;
  sourceLabel: string;
  sourceSite: string;
  sourceUrl: string;
  kind: CollectorSourceType;
  collectedAt: string;
  reviews: CollectedReviewSnippet[];
  offers: CollectedOffer[];
};

export type CollectorRunResult = {
  product: CollectibleProductInput;
  startedAt: string;
  finishedAt: string;
  persisted: boolean;
  productId: string | null;
  reviewCount: number;
  offerCount: number;
  sourcesVisited: number;
  sourcesCollected: CollectedSourcePage[];
};

export type LowestPriceResult = {
  amount: number | null;
  currency: string | null;
  sourceSite: string | null;
  offerUrl: string | null;
};

export type ProductScoringInput = {
  product: Partial<ProductEntity> | CollectibleProductInput;
  reviewSnippets: Array<ReviewSnippetEntity | CollectedReviewSnippet>;
  offers: Array<OfferEntity | CollectedOffer>;
};

export type ScoreExplanationPart = {
  label: string;
  impact: number;
  reason: string;
};

export type ProductScoreResult = {
  overallTrustScore: number;
  fitQualityScore: number | null;
  colorAccuracyScore: number | null;
  materialFabricScore: number | null;
  confidenceScore: number;
  lowestPrice: LowestPriceResult;
  explanation: string;
  breakdown: ScoreExplanationPart[];
};

export type ResultsViewModel = {
  product: {
    id: string;
    originalUrl: string;
    sourceSite: string | null;
    title: string | null;
    normalizedTitle: string | null;
    brand: string | null;
    image: string | null;
    description: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  };
  reviewSnippets: CollectedReviewSnippet[];
  offers: CollectedOffer[];
  score: ProductScoreResult;
};
