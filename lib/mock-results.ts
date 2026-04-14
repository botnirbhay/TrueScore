import { inferProductIdentityFromUrl } from "./parser.ts";
import { scoreProduct } from "./scoring.ts";

import type { AnalysisResult } from "@/types";
import type { CollectedOffer, CollectedReviewSnippet, ResultsViewModel } from "@/types/entities";

function safeHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "example.com";
  }
}

function titleFromUrl(url: string) {
  return `Product from ${brandFromHostname(safeHostname(url))}`;
}

function brandFromHostname(hostname: string) {
  const root = hostname.replace(/^www\./, "").split(".")[0] ?? "Brand";
  return root.charAt(0).toUpperCase() + root.slice(1);
}

function normalizedTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function relevantDescriptors(text: string) {
  const lowered = text.toLowerCase();

  return {
    fit: /\b(fit|size|sizing|shirt|dress|jacket|shoe|sneaker|jeans|pants)\b/.test(lowered),
    color: /\b(color|colour|shade|blue|black|white|green|red|beige|navy)\b/.test(lowered),
    material: /\b(material|fabric|cotton|wool|linen|leather|denim|polyester|fleece)\b/.test(lowered)
  };
}

export function buildFallbackAnalysisResult(url: string): AnalysisResult {
  const hostname = safeHostname(url);
  const inferred = inferProductIdentityFromUrl(url);
  const title = inferred.title ?? titleFromUrl(url);
  const brand = inferred.brand ?? brandFromHostname(hostname);

  return {
    id: `fallback-${hostname.replace(/[^\w-]+/g, "-")}`,
    originalUrl: url,
    canonicalUrl: inferred.canonicalUrl ?? url,
    sourceSite: hostname,
    title,
    normalizedTitle: normalizedTitle(title),
    brand,
    image: null,
    description: `Fallback product record for ${title} while live saved data is unavailable.`,
    metadata: {
      sourceSite: hostname,
      mode: "fallback",
      fetchedAt: new Date().toISOString(),
      rawTitle: inferred.rawTitle ?? title,
      sku: inferred.normalizedSku,
      normalizedBrand: inferred.normalizedBrand,
      identityConfidence: inferred.identityConfidence ?? 0.15
    },
    createdAt: new Date().toISOString()
  };
}

export function buildMockResultsModel(product: AnalysisResult): ResultsViewModel {
  const hostname = product.sourceSite ?? safeHostname(product.originalUrl);
  const brand = product.brand ?? brandFromHostname(hostname);
  const title = product.title ?? titleFromUrl(product.originalUrl);
  const description = product.description ?? `${brand} ${title} with baseline metadata and mock evidence.`;
  const descriptorFlags = relevantDescriptors(`${title} ${description}`);
  const now = new Date().toISOString();

  const reviews: CollectedReviewSnippet[] = [
    {
      sourceSite: "reddit.com",
      sourceUrl: "https://reddit.com/r/BuyItForLife/comments/example",
      authorName: "u/verified-owner",
      reviewTitle: "Detailed owner impressions",
      reviewText: [
        `${title} feels well made and consistent with the listing.`,
        descriptorFlags.fit ? "Fit and sizing were predictable after real-world use." : "Setup and day-to-day usability felt straightforward.",
        descriptorFlags.color ? "The color matched the product photos closely." : "The overall finish looked consistent in person.",
        descriptorFlags.material ? "The material quality felt stronger than generic alternatives." : "Build quality held up better than expected."
      ].join(" "),
      ratingValue: 4.4,
      ratingScale: 5,
      qualityTags: ["durability", "value", ...(descriptorFlags.fit ? ["fit"] : []), ...(descriptorFlags.color ? ["color"] : []), ...(descriptorFlags.material ? ["material"] : [])],
      confidenceScore: 0.82,
      collectedAt: now
    },
    {
      sourceSite: hostname,
      sourceUrl: product.originalUrl,
      authorName: "Verified Buyer",
      reviewTitle: "Strong first impression",
      reviewText: [
        `The ${title} arrived as described and the quality felt reliable.`,
        descriptorFlags.fit ? "Sizing details were close to expectation." : "Day-one use felt polished.",
        descriptorFlags.material ? "Fabric and finish both seemed premium for the segment." : "Materials and finish felt better than generic marketplace options."
      ].join(" "),
      ratingValue: 4.2,
      ratingScale: 5,
      qualityTags: ["quality", "comfort", ...(descriptorFlags.material ? ["material"] : [])],
      confidenceScore: 0.74,
      collectedAt: now
    },
    {
      sourceSite: "bestbuy.com",
      sourceUrl: "https://www.bestbuy.com/site/searchpage.jsp?st=example",
      authorName: "Marketplace Customer",
      reviewTitle: "Good value with a few caveats",
      reviewText: [
        `Value looked solid relative to competing listings for ${title}.`,
        descriptorFlags.color ? "Color was slightly different under indoor lighting, but still close overall." : "Some details felt more generic than premium.",
        descriptorFlags.fit ? "Fit feedback may vary across preferences." : "Long-term durability still needs more evidence."
      ].join(" "),
      ratingValue: 3.8,
      ratingScale: 5,
      qualityTags: ["value", ...(descriptorFlags.color ? ["color"] : []), ...(descriptorFlags.fit ? ["fit"] : [])],
      confidenceScore: 0.66,
      collectedAt: now
    }
  ];

  const offers: CollectedOffer[] = [
    {
      sourceSite: hostname,
      sourceUrl: product.originalUrl,
      merchantName: brand,
      offerUrl: product.originalUrl,
      currency: "USD",
      price: "119.00",
      shipping: "0.00",
      totalPrice: "119.00",
      originalCurrency: "USD",
      originalPrice: "119.00",
      originalShipping: "0.00",
      originalTotalPrice: "119.00",
      convertedPriceUsd: "119.00",
      convertedShippingUsd: "0.00",
      convertedTotalPriceUsd: "119.00",
      exchangeRateUsed: 1,
      conversionTimestamp: now,
      availability: "in stock",
      qualityTags: ["direct-source"],
      confidenceScore: 0.8,
      collectedAt: now
    },
    {
      sourceSite: "walmart.com",
      sourceUrl: "https://www.walmart.com/search?q=example",
      merchantName: "Walmart",
      offerUrl: "https://www.walmart.com/ip/example",
      currency: "USD",
      price: "109.00",
      shipping: "6.00",
      totalPrice: "115.00",
      originalCurrency: "USD",
      originalPrice: "109.00",
      originalShipping: "6.00",
      originalTotalPrice: "115.00",
      convertedPriceUsd: "109.00",
      convertedShippingUsd: "6.00",
      convertedTotalPriceUsd: "115.00",
      exchangeRateUsed: 1,
      conversionTimestamp: now,
      availability: "available",
      qualityTags: ["marketplace"],
      confidenceScore: 0.7,
      collectedAt: now
    },
    {
      sourceSite: "bestbuy.com",
      sourceUrl: "https://www.bestbuy.com/site/searchpage.jsp?st=example",
      merchantName: "Best Buy",
      offerUrl: "https://www.bestbuy.com/site/example",
      currency: "USD",
      price: "112.99",
      shipping: "0.00",
      totalPrice: "112.99",
      originalCurrency: "USD",
      originalPrice: "112.99",
      originalShipping: "0.00",
      originalTotalPrice: "112.99",
      convertedPriceUsd: "112.99",
      convertedShippingUsd: "0.00",
      convertedTotalPriceUsd: "112.99",
      exchangeRateUsed: 1,
      conversionTimestamp: now,
      availability: "in stock",
      qualityTags: ["retailer"],
      confidenceScore: 0.72,
      collectedAt: now
    }
  ];

  return buildResultsModelFromEvidence(
    {
      ...product,
      title,
      brand,
      description
    },
    reviews,
    offers
  );
}

export function buildResultsModelFromEvidence(
  product: AnalysisResult,
  reviewSnippets: CollectedReviewSnippet[],
  offers: CollectedOffer[]
): ResultsViewModel {
  const score = scoreProduct({
    product: {
      originalUrl: product.originalUrl,
      canonicalUrl: product.canonicalUrl ?? product.originalUrl,
      sourceSite: product.sourceSite,
      title: product.title,
      brand: product.brand,
      normalizedTitle: product.normalizedTitle,
      description: product.description,
      metadata: product.metadata
    },
    reviewSnippets,
    offers
  });

  return {
    product,
    reviewSnippets,
    offers,
    score
  };
}
