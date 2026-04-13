import "dotenv/config";

import { collectFromAllowlistedSources } from "@/lib/crawler";
import { prisma } from "@/lib/prisma";
import type { CollectedOffer, CollectedReviewSnippet, CollectibleProductInput, CollectorRunResult } from "@/types/entities";

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];
    if (part.startsWith("--")) {
      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        args.set(part, next);
        index += 1;
      } else {
        args.set(part, "true");
      }
    }
  }

  return args;
}

function toJson(data: unknown) {
  return JSON.stringify(data, null, 2);
}

function normalizeProductArgument(args: Map<string, string>) {
  const input = args.get("--url") ?? args.get("--product");

  if (!input) {
    throw new Error("Missing input. Use --url <productUrl> or --product '<json>'.");
  }

  if (args.has("--product")) {
    return JSON.parse(input) as CollectibleProductInput;
  }

  return input;
}

function reviewDedupKey(item: CollectedReviewSnippet) {
  return `${item.sourceSite}:${item.reviewText.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

function offerDedupKey(item: CollectedOffer) {
  return `${item.sourceSite}:${item.offerUrl}:${item.price ?? "na"}:${item.shipping ?? "na"}`;
}

async function ensureProductRecord(product: CollectibleProductInput) {
  if (product.id) {
    const existing = await prisma.product.findUnique({ where: { id: product.id } });
    if (existing) {
      return existing;
    }
  }

  return prisma.product.create({
    data: {
      originalUrl: product.originalUrl,
      canonicalUrl: product.originalUrl,
      sourceSite: product.sourceSite ?? null,
      title: product.title ?? null,
      brand: product.brand ?? null,
      normalizedBrand: product.normalizedBrand ?? product.brand ?? null,
      normalizedTitle: product.normalizedTitle ?? null,
      normalizedSku: product.normalizedSku ?? null,
      crawlStatus: "RUNNING"
    }
  });
}

async function upsertProductSource(productId: string, sourceUrl: string, sourceSite: string, kind: "review" | "offer") {
  return prisma.productSource.upsert({
    where: {
      sourceSite_sourceUrl: {
        sourceSite,
        sourceUrl
      }
    },
    update: {
      pageType: kind === "review" ? "REVIEW_PAGE" : "OFFER_PAGE",
      lastFetchedAt: new Date()
    },
    create: {
      productId,
      sourceSite,
      sourceUrl,
      pageType: kind === "review" ? "REVIEW_PAGE" : "OFFER_PAGE",
      lastFetchedAt: new Date()
    }
  });
}

async function persistCollectedData(result: Omit<CollectorRunResult, "persisted" | "productId">) {
  const productRecord = await ensureProductRecord(result.product);
  const existingReviews = await prisma.reviewSnippet.findMany({
    where: { productId: productRecord.id },
    select: { sourceSite: true, reviewText: true }
  });
  const existingOffers = await prisma.offer.findMany({
    where: { productId: productRecord.id },
    select: { sourceSite: true, offerUrl: true, price: true, shipping: true }
  });

  const existingReviewKeys = new Set(
    existingReviews.map(
      (item: { sourceSite: string | null; reviewText: string }) =>
        `${item.sourceSite ?? "unknown"}:${item.reviewText.toLowerCase().replace(/\s+/g, " ").trim()}`
    )
  );
  const existingOfferKeys = new Set(
    existingOffers.map(
      (item: { sourceSite: string; offerUrl: string | null; price: { toString(): string }; shipping: { toString(): string } | null }) =>
        `${item.sourceSite}:${item.offerUrl ?? "na"}:${item.price.toString()}:${item.shipping?.toString() ?? "na"}`
    )
  );

  for (const page of result.sourcesCollected) {
    const productSource = await upsertProductSource(productRecord.id, page.sourceUrl, page.sourceSite, page.kind);

    for (const review of page.reviews) {
      const key = reviewDedupKey(review);
      if (existingReviewKeys.has(key)) {
        continue;
      }

      await prisma.reviewSnippet.create({
        data: {
          productId: productRecord.id,
          productSourceId: productSource.id,
          sourceSite: review.sourceSite,
          authorName: review.authorName,
          reviewTitle: review.reviewTitle,
          reviewText: review.reviewText,
          ratingValue: review.ratingValue,
          ratingScale: review.ratingScale,
          qualityTags: review.qualityTags,
          confidenceScore: review.confidenceScore,
          publishedAt: new Date(review.collectedAt)
        }
      });

      existingReviewKeys.add(key);
    }

    for (const offer of page.offers) {
      const key = offerDedupKey(offer);
      if (!offer.price || !offer.currency || existingOfferKeys.has(key)) {
        continue;
      }

      const price = offer.price;
      const shipping = offer.shipping;
      const totalPrice =
        offer.totalPrice ??
        (shipping && !Number.isNaN(Number(shipping)) ? (Number(price) + Number(shipping)).toFixed(2) : price);

      await prisma.offer.create({
        data: {
          productId: productRecord.id,
          productSourceId: productSource.id,
          sourceSite: offer.sourceSite,
          merchantName: offer.merchantName,
          offerUrl: offer.offerUrl,
          availability: offer.availability,
          currency: offer.currency,
          price,
          shipping,
          totalPrice,
          qualityTags: offer.qualityTags,
          confidenceScore: offer.confidenceScore,
          observedAt: new Date(offer.collectedAt)
        }
      });

      existingOfferKeys.add(key);
    }
  }

  await prisma.product.update({
    where: { id: productRecord.id },
    data: {
      crawlStatus: result.reviewCount === 0 && result.offerCount === 0 ? "PARTIAL" : "SUCCEEDED",
      lastCrawledAt: new Date()
    }
  });

  return productRecord.id;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = normalizeProductArgument(args);
  const startedAt = new Date().toISOString();

  console.log("[collector] starting run", { startedAt });

  const collected = await collectFromAllowlistedSources(input, {
    maxSources: Number(args.get("--max-sources") ?? "3")
  });

  const resultBase = {
    product: collected.product,
    startedAt,
    finishedAt: new Date().toISOString(),
    searchQueries: collected.searchQueries,
    pagesFound: collected.pagesFound,
    validMatches: collected.validMatches,
    reviewCount: collected.reviewCount,
    offerCount: collected.offerCount,
    sourcesVisited: collected.sourcesVisited,
    sourcesCollected: collected.sourcesCollected
  };

  console.log("[collector] finished collection", {
    searchQueries: collected.searchQueries,
    pagesFound: collected.pagesFound,
    validMatches: collected.validMatches,
    reviews: collected.reviewCount,
    offers: collected.offerCount
  });

  if (!process.env.DATABASE_URL) {
    const output: CollectorRunResult = {
      ...resultBase,
      persisted: false,
      productId: null
    };

    console.warn("[collector] DATABASE_URL not set; returning collected JSON only");
    console.log(toJson(output));
    return;
  }

  try {
    const productId = await persistCollectedData(resultBase);
    const output: CollectorRunResult = {
      ...resultBase,
      persisted: true,
      productId
    };

    console.log("[collector] persistence complete", {
      productId,
      reviewCount: output.reviewCount,
      offerCount: output.offerCount
    });
    console.log(toJson(output));
  } catch (error) {
    console.error("[collector] persistence failed; returning collected JSON fallback", error);

    const output: CollectorRunResult = {
      ...resultBase,
      persisted: false,
      productId: null
    };

    console.log(toJson(output));
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error("[collector] worker failed", error);
  process.exitCode = 1;
});
