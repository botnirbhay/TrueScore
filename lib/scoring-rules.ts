export type DimensionKey = "fit" | "color" | "material";

export type ScoringRules = {
  baseScore: number;
  evidenceWeights: {
    reviewBase: number;
    detailedReviewBonus: number;
    ratingWeight: number;
    independentSourceBonus: number;
    metadataCompletenessBonus: number;
    offerCoverageBonus: number;
    conflictPenalty: number;
    lowEvidencePenalty: number;
  };
  detailThresholds: {
    detailedReviewWords: number;
    strongSourceCount: number;
  };
  keywordSets: {
    trustPositive: string[];
    trustNegative: string[];
    fitPositive: string[];
    fitNegative: string[];
    colorPositive: string[];
    colorNegative: string[];
    materialPositive: string[];
    materialNegative: string[];
    fitRelevant: string[];
    colorRelevant: string[];
    materialRelevant: string[];
  };
};

export const DEFAULT_SCORING_RULES: ScoringRules = {
  baseScore: 50,
  evidenceWeights: {
    reviewBase: 7,
    detailedReviewBonus: 5,
    ratingWeight: 8,
    independentSourceBonus: 6,
    metadataCompletenessBonus: 8,
    offerCoverageBonus: 5,
    conflictPenalty: 10,
    lowEvidencePenalty: 12
  },
  detailThresholds: {
    detailedReviewWords: 18,
    strongSourceCount: 2
  },
  keywordSets: {
    trustPositive: [
      "durable",
      "well made",
      "well-made",
      "sturdy",
      "worth it",
      "holds up",
      "high quality",
      "comfortable",
      "great value",
      "excellent"
    ],
    trustNegative: [
      "cheap",
      "flimsy",
      "fell apart",
      "poor quality",
      "disappointed",
      "returned",
      "inconsistent",
      "defective",
      "bad quality",
      "overpriced"
    ],
    fitPositive: ["fit", "fits well", "true to size", "tailored", "comfortable fit", "roomy", "supportive"],
    fitNegative: ["too small", "too big", "tight", "loose", "awkward fit", "not true to size", "sizing issue"],
    colorPositive: ["color accurate", "true color", "matches photos", "matches the photos", "looks like pictured", "rich color"],
    colorNegative: ["color off", "different color", "washed out", "darker than expected", "lighter than expected"],
    materialPositive: ["soft", "premium fabric", "breathable", "thick material", "good fabric", "quality material"],
    materialNegative: ["thin fabric", "scratchy", "cheap material", "rough", "poor fabric", "see through"],
    fitRelevant: ["fit", "size", "sizing", "waist", "inseam", "shoulder", "shoe", "sneaker", "shirt", "dress", "jacket"],
    colorRelevant: ["color", "shade", "tone", "navy", "black", "white", "blue", "red", "green", "beige"],
    materialRelevant: ["cotton", "wool", "linen", "polyester", "fabric", "material", "leather", "denim", "fleece"]
  }
};
