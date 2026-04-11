import assert from "node:assert/strict";

import { scoreProduct } from "../lib/scoring.ts";
import type { CollectedOffer, CollectedReviewSnippet, CollectibleProductInput } from "../types/entities";

function buildReview(overrides: Partial<CollectedReviewSnippet> = {}): CollectedReviewSnippet {
  return {
    sourceSite: "reddit.com",
    sourceUrl: "https://reddit.com/r/example",
    authorName: "reviewer",
    reviewTitle: "Helpful review",
    reviewText: "Very comfortable fit, soft material, durable stitching, and it feels high quality after weeks of use.",
    ratingValue: 4.5,
    ratingScale: 5,
    qualityTags: ["comfort", "durability", "fit"],
    confidenceScore: 0.8,
    collectedAt: "2026-04-11T00:00:00.000Z",
    ...overrides
  };
}

function buildOffer(overrides: Partial<CollectedOffer> = {}): CollectedOffer {
  return {
    sourceSite: "bestbuy.com",
    sourceUrl: "https://bestbuy.com/example",
    merchantName: "Best Buy",
    offerUrl: "https://bestbuy.com/example",
    currency: "USD",
    price: "99.99",
    shipping: "0.00",
    totalPrice: "99.99",
    availability: "in stock",
    qualityTags: [],
    confidenceScore: 0.7,
    collectedAt: "2026-04-11T00:00:00.000Z",
    ...overrides
  };
}

function buildProduct(overrides: Partial<CollectibleProductInput> = {}): CollectibleProductInput {
  return {
    originalUrl: "https://example.com/products/cotton-jacket",
    title: "Premium Cotton Jacket",
    normalizedTitle: "premium cotton jacket",
    brand: "Acme",
    normalizedBrand: "Acme",
    sourceSite: "example.com",
    ...overrides
  };
}

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("scores strong multi-source evidence highly", () => {
  const result = scoreProduct({
    product: {
      ...buildProduct(),
      description: "Soft cotton jacket with accurate navy color and durable fabric."
    },
    reviewSnippets: [
      buildReview(),
      buildReview({
        sourceSite: "bestbuy.com",
        sourceUrl: "https://bestbuy.com/reviews/example",
        reviewText:
          "True to size, color matches the photos, and the material feels premium instead of cheap.",
        qualityTags: ["fit", "material", "color"]
      })
    ],
    offers: [
      buildOffer(),
      buildOffer({ sourceSite: "walmart.com", offerUrl: "https://walmart.com/item/1", totalPrice: "94.99", price: "89.99", shipping: "5.00" })
    ]
  });

  assert.equal(result.lowestPrice.amount, 94.99);
  assert.equal(result.lowestPrice.sourceSite, "walmart.com");
  assert.ok(result.overallTrustScore >= 75);
  assert.ok(result.confidenceScore >= 70);
  assert.ok(result.fitQualityScore !== null && result.fitQualityScore >= 70);
  assert.ok(result.colorAccuracyScore !== null && result.colorAccuracyScore >= 65);
  assert.ok(result.materialFabricScore !== null && result.materialFabricScore >= 70);
  assert.match(result.explanation, /multiple independent sources/i);
});

runTest("penalizes conflicting review signals", () => {
  const result = scoreProduct({
    product: {
      ...buildProduct(),
      description: "Cotton jacket available in blue."
    },
    reviewSnippets: [
      buildReview({
        reviewText: "Comfortable fit and soft material. Great quality overall.",
        ratingValue: 4.7
      }),
      buildReview({
        sourceSite: "walmart.com",
        sourceUrl: "https://walmart.com/reviews/example",
        reviewText:
          "Too small, color off compared with photos, and the fabric feels cheap after one wash.",
        ratingValue: 2.1,
        qualityTags: ["fit", "color", "material"],
        confidenceScore: 0.85
      }),
      buildReview({
        sourceSite: "bestbuy.com",
        sourceUrl: "https://bestbuy.com/reviews/example",
        reviewText: "Sizing issue for me and the shade looked darker than expected.",
        ratingValue: 2.8,
        qualityTags: ["fit", "color"],
        confidenceScore: 0.7
      })
    ],
    offers: [buildOffer()]
  });

  assert.ok(result.overallTrustScore < 70);
  assert.ok(result.fitQualityScore !== null && result.fitQualityScore < 60);
  assert.ok(result.colorAccuracyScore !== null && result.colorAccuracyScore < 60);
  assert.match(result.explanation, /conflicting signals/i);
  assert.ok(result.breakdown.some((item) => item.label === "conflict" && item.impact < 0));
});

runTest("works with in-memory data and limited evidence", () => {
  const result = scoreProduct({
    product: buildProduct({
      title: "Everyday Mug",
      normalizedTitle: "everyday mug"
    }),
    reviewSnippets: [],
    offers: [buildOffer({ sourceSite: "example.com", price: "18.00", shipping: "2.00", totalPrice: "20.00" })]
  });

  assert.equal(result.lowestPrice.amount, 20);
  assert.equal(result.fitQualityScore, null);
  assert.equal(result.colorAccuracyScore, null);
  assert.equal(result.materialFabricScore, null);
  assert.ok(result.confidenceScore < 70);
  assert.ok(result.overallTrustScore < 65);
});

console.log("Scoring tests completed.");
