import assert from "node:assert/strict";


import { buildFallbackAnalysisResult } from "../lib/mock-results.ts";
import { inferProductIdentityFromUrl, normalizeProductUrl, parseProductMetadataFromHtml } from "../lib/parser.ts";
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
  const base: CollectedOffer = {
    sourceSite: "bestbuy.com",
    sourceUrl: "https://bestbuy.com/example",
    merchantName: "Best Buy",
    offerUrl: "https://bestbuy.com/example",
    currency: "USD",
    price: "99.99",
    shipping: "0.00",
    totalPrice: "99.99",
    originalCurrency: "USD",
    originalPrice: "99.99",
    originalShipping: "0.00",
    originalTotalPrice: "99.99",
    convertedPriceUsd: "99.99",
    convertedShippingUsd: "0.00",
    convertedTotalPriceUsd: "99.99",
    exchangeRateUsed: 1,
    conversionTimestamp: "2026-04-11T00:00:00.000Z",
    availability: "in stock",
    qualityTags: [],
    confidenceScore: 0.7,
    collectedAt: "2026-04-11T00:00:00.000Z",
  };

  const next = {
    ...base,
    ...overrides
  };

  return {
    ...next,
    originalCurrency: overrides.originalCurrency ?? next.currency,
    originalPrice: overrides.originalPrice ?? next.price,
    originalShipping: overrides.originalShipping ?? next.shipping,
    originalTotalPrice: overrides.originalTotalPrice ?? next.totalPrice,
    convertedPriceUsd: overrides.convertedPriceUsd ?? (next.currency === "USD" ? next.price : null),
    convertedShippingUsd: overrides.convertedShippingUsd ?? (next.currency === "USD" ? next.shipping : null),
    convertedTotalPriceUsd: overrides.convertedTotalPriceUsd ?? (next.currency === "USD" ? next.totalPrice : null),
    exchangeRateUsed: overrides.exchangeRateUsed ?? (next.currency === "USD" ? 1 : null),
    conversionTimestamp: overrides.conversionTimestamp ?? (next.currency === "USD" ? next.collectedAt : null)
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
  assert.equal(result.lowestPrice.observedAt, "2026-04-11T00:00:00.000Z");
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

runTest("normalizes non-usd offers before lowest-price comparison", () => {
  const result = scoreProduct({
    product: buildProduct(),
    reviewSnippets: [],
    offers: [
      buildOffer({
        sourceSite: "amazon.in",
        currency: "INR",
        price: "1754.10",
        shipping: "0.00",
        totalPrice: "1754.10",
        originalCurrency: "INR",
        originalPrice: "1754.10",
        originalShipping: "0.00",
        originalTotalPrice: "1754.10",
        convertedPriceUsd: null,
        convertedShippingUsd: null,
        convertedTotalPriceUsd: null,
        exchangeRateUsed: null,
        conversionTimestamp: null
      }),
      buildOffer({
        sourceSite: "bestbuy.com",
        currency: "USD",
        price: "30.00",
        shipping: "0.00",
        totalPrice: "30.00",
        originalCurrency: "USD",
        originalPrice: "30.00",
        originalShipping: "0.00",
        originalTotalPrice: "30.00"
      })
    ]
  });

  assert.ok(result.lowestPrice.amount !== null && result.lowestPrice.amount < 30);
  assert.equal(result.lowestPrice.currency, "USD");
  assert.equal(result.lowestPrice.sourceSite, "amazon.in");
  assert.match(result.explanation, /\$/i);
});

runTest("parses clean product identity from noisy Amazon search pages", () => {
  const html = `
    <html>
      <head>
        <title>Amazon.in : ref=sr_1_1_sspa sponsored search</title>
        <link rel="canonical" href="https://www.amazon.in/s?k=wireless+mouse&ref=sr_pg_1" />
      </head>
      <body>
        <div data-component-type="s-search-result">
          <a href="/Logitech-Signature-M650-Wireless-Mouse/dp/B09Y27YMM3/ref=sr_1_1_sspa">
            <span>Logitech Signature M650 Wireless Mouse for Small to Large Hands</span>
          </a>
        </div>
      </body>
    </html>
  `;

  const parsed = parseProductMetadataFromHtml(html, "https://www.amazon.in/s?k=wireless+mouse&ref=sr_1_1_sspa");

  assert.equal(parsed.title, "Logitech Signature M650 Wireless Mouse for Small to Large Hands");
  assert.equal(parsed.sku, "B09Y27YMM3");
  assert.equal(parsed.canonicalUrl, "https://www.amazon.in/dp/B09Y27YMM3");
  assert.ok(parsed.identityConfidence >= 0.6);
  assert.doesNotMatch(parsed.title ?? "", /ref=|sspa|sponsored/i);
});

runTest("normalizes noisy Amazon product URLs before fetch", () => {
  const url =
    "https://www.amazon.in/iPhone-Air-256-GB-Promotion/dp/B0FQFLWN5Z/ref=sr_1_6?crid=15D8PW0QGC1PL&dib=abc&dib_tag=se&keywords=iphone+17+pro&qid=1776148711&sprefix=iphon&sr=8-6";

  assert.equal(normalizeProductUrl(url), "https://www.amazon.in/dp/B0FQFLWN5Z");
});

runTest("falls back to URL-derived identity instead of generic amazon text", () => {
  const url = "https://www.amazon.in/iPhone-Air-256-GB-Promotion/dp/B0FQFLWN5Z/ref=sr_1_6?keywords=iphone+17+pro&sr=8-6";
  const inferred = inferProductIdentityFromUrl(url);
  const fallback = buildFallbackAnalysisResult(url);

  assert.equal(inferred.canonicalUrl, "https://www.amazon.in/dp/B0FQFLWN5Z");
  assert.equal(inferred.normalizedSku, "B0FQFLWN5Z");
  assert.equal(fallback.canonicalUrl, "https://www.amazon.in/dp/B0FQFLWN5Z");
  assert.notEqual(fallback.title, "Product from Amazon");
  assert.match(fallback.title ?? "", /iphone air 256 gb promotion/i);
});

runTest("normalizes generic ecommerce URLs and infers a clean title", () => {
  const url =
    "https://shop.example.com/products/sony-wh-1000xm5-wireless-headphones-black?utm_source=newsletter&fbclid=abc123&variant=4499001";
  const normalized = normalizeProductUrl(url);
  const inferred = inferProductIdentityFromUrl(url);

  assert.equal(normalized, "https://shop.example.com/products/sony-wh-1000xm5-wireless-headphones-black?variant=4499001");
  assert.equal(inferred.canonicalUrl, normalized);
  assert.equal(inferred.normalizedTitle, "sony wh 1000xm5 wireless headphones black");
  assert.equal(inferred.normalizedSku, null);
  assert.ok((inferred.identityConfidence ?? 0) >= 0.28);
  assert.doesNotMatch(inferred.title ?? "", /utm_|fbclid|ref=|sr=/i);
});

runTest("highlights uncertain identity in the explanation", () => {
  const result = scoreProduct({
    product: {
      ...buildProduct({
        title: "Unknown item",
        normalizedTitle: "unknown item"
      }),
      metadata: {
        identityConfidence: 0.22
      }
    },
    reviewSnippets: [buildReview({ ratingValue: 4.1 })],
    offers: [buildOffer()]
  });

  assert.ok(result.confidenceScore < 70);
  assert.match(result.explanation, /identity was uncertain/i);
  assert.ok(result.breakdown.some((item) => item.label === "identity" && item.impact < 0));
});

console.log("Scoring tests completed.");
