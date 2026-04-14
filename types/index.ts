export type AnalysisResult = {
  id: string;
  originalUrl: string;
  canonicalUrl?: string | null;
  sourceSite: string | null;
  title: string | null;
  normalizedTitle: string | null;
  brand: string | null;
  image: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type {
  CollectedOffer,
  CollectedReviewSnippet,
  CollectedSourcePage,
  CollectibleProductInput,
  CollectorRunResult,
  CollectorSourceType,
  CrawlJobEntity,
  CrawlStatus,
  CrawlTrigger,
  LowestPriceResult,
  OfferEntity,
  ProcessingJob,
  ProcessingJobStatus,
  ProductEntity,
  ProductScoreResult,
  ProductScoringInput,
  ProductSourceEntity,
  ResultsViewModel,
  ReviewSnippetEntity,
  ScoreExplanationPart,
  ScoreEntity,
  ScoreType,
  SourcePageType
} from "@/types/entities";
