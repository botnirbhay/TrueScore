import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const productSlug = "everlane-organic-cotton-crew";
const productUrl =
  "https://www.everlane.com/products/mens-organic-cotton-crew-heather-grey";
const sourceSite = "everlane.com";

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();

    const product = await tx.product.upsert({
      where: {
        slug: productSlug
      },
      update: {
        originalUrl: productUrl,
        canonicalUrl: productUrl,
        sourceSite,
        title: "The Organic Cotton Crew",
        brand: "Everlane",
        imageUrl: "https://images.examplecdn.com/everlane/organic-cotton-crew.jpg",
        normalizedBrand: "Everlane",
        normalizedTitle: "Organic Cotton Crew",
        normalizedSku: "EV-OC-CREW-HGRY",
        normalizedCategory: "apparel",
        metadata: {
          sourceSite,
          currency: "USD",
          fetchedAt: now.toISOString(),
          extractionSignals: ["title", "description", "image", "price", "brand"]
        },
        normalizedAttributes: {
          audience: "adult",
          material: ["organic cotton"],
          color: "heather grey"
        },
        description: "Seed product used to validate the TrueScore MVP data model.",
        qualityTags: ["organic-material", "essentials", "midweight"],
        confidenceScore: 0.91,
        crawlStatus: "SUCCEEDED",
        lastCrawledAt: now
      },
      create: {
        originalUrl: productUrl,
        canonicalUrl: productUrl,
        slug: productSlug,
        sourceSite,
        title: "The Organic Cotton Crew",
        brand: "Everlane",
        imageUrl: "https://images.examplecdn.com/everlane/organic-cotton-crew.jpg",
        normalizedBrand: "Everlane",
        normalizedTitle: "Organic Cotton Crew",
        normalizedSku: "EV-OC-CREW-HGRY",
        normalizedCategory: "apparel",
        metadata: {
          sourceSite,
          currency: "USD",
          fetchedAt: now.toISOString(),
          extractionSignals: ["title", "description", "image", "price", "brand"],
          rawTitle: "The Organic Cotton Crew",
          description: "Seed product used to validate the TrueScore MVP data model.",
          image: "https://images.examplecdn.com/everlane/organic-cotton-crew.jpg",
          price: "68.00",
          brand: "Everlane"
        },
        normalizedAttributes: {
          audience: "adult",
          material: ["organic cotton"],
          color: "heather grey"
        },
        description: "Seed product used to validate the TrueScore MVP data model.",
        qualityTags: ["organic-material", "essentials", "midweight"],
        confidenceScore: 0.91,
        crawlStatus: "SUCCEEDED",
        lastCrawledAt: now
      }
    });

    const productSource = await tx.productSource.upsert({
      where: {
        sourceSite_sourceUrl: {
          sourceSite,
          sourceUrl: productUrl
        }
      },
      update: {
        productId: product.id,
        pageType: "PRODUCT_PAGE",
        sourceBrand: "Everlane",
        sourceTitle: "The Organic Cotton Crew",
        sourceSku: "EV-OC-CREW-HGRY",
        sourceCategory: "tops",
        availability: "in_stock",
        qualityTags: ["brand-site", "primary-source"],
        confidenceScore: 0.96,
        lastFetchedAt: now,
        extractedPayload: {
          breadcrumbs: ["Men", "Tops", "Sweatshirts"],
          materials: ["organic cotton"]
        }
      },
      create: {
        productId: product.id,
        sourceSite,
        sourceUrl: productUrl,
        pageType: "PRODUCT_PAGE",
        sourceBrand: "Everlane",
        sourceTitle: "The Organic Cotton Crew",
        sourceSku: "EV-OC-CREW-HGRY",
        sourceCategory: "tops",
        availability: "in_stock",
        qualityTags: ["brand-site", "primary-source"],
        confidenceScore: 0.96,
        lastFetchedAt: now,
        extractedPayload: {
          breadcrumbs: ["Men", "Tops", "Sweatshirts"],
          materials: ["organic cotton"]
        }
      }
    });

    // These models all hang off Product, and some optionally point at ProductSource.
    // Rebuild the child rows each seed run so the seed stays idempotent without a
    // brittle multi-level nested write.
    await tx.reviewSnippet.deleteMany({
      where: { productId: product.id }
    });
    await tx.offer.deleteMany({
      where: { productId: product.id }
    });
    await tx.score.deleteMany({
      where: { productId: product.id }
    });
    await tx.crawlJob.deleteMany({
      where: { productId: product.id }
    });

    // ReviewSnippet requires productId. productSourceId is optional, but we set it
    // because this review was extracted from a specific ProductSource row.
    await tx.reviewSnippet.create({
      data: {
        productId: product.id,
        productSourceId: productSource.id,
        sourceSite,
        authorName: "Verified Buyer",
        reviewTitle: "Comfortable daily crew",
        reviewText:
          "Soft fabric, clean fit, and it held up well after multiple washes.",
        ratingValue: 4.6,
        ratingScale: 5,
        qualityTags: ["comfort", "durability", "fit"],
        sentimentLabel: "positive",
        confidenceScore: 0.84,
        publishedAt: new Date("2025-11-18T00:00:00.000Z")
      }
    });

    // Offer also requires productId. productSourceId stays attached so pricing data
    // can be traced back to the source page it came from.
    await tx.offer.create({
      data: {
        productId: product.id,
        productSourceId: productSource.id,
        sourceSite,
        merchantName: "Everlane",
        offerUrl: productUrl,
        sku: "EV-OC-CREW-HGRY",
        condition: "new",
        availability: "in_stock",
        currency: "USD",
        price: "68.00",
        shipping: "5.00",
        totalPrice: "73.00",
        qualityTags: ["direct-retailer"],
        confidenceScore: 0.95,
        isPrimary: true,
        observedAt: now
      }
    });

    // Score requires productId. productSourceId is optional; we set it here because
    // this overall score is derived from the same ProductSource.
    await tx.score.create({
      data: {
        productId: product.id,
        productSourceId: productSource.id,
        scoreType: "OVERALL",
        sourceSite,
        value: 82,
        confidenceScore: 0.88,
        rationale:
          "Strong primary-source completeness, healthy review signal, and stable pricing.",
        qualityTags: ["good-value", "positive-reviews", "clear-brand-data"]
      }
    });

    // CrawlJob can exist without relations, but for a seeded source crawl we attach
    // both ids so job history is connected to the Product and ProductSource records.
    await tx.crawlJob.create({
      data: {
        productId: product.id,
        productSourceId: productSource.id,
        originalUrl: productUrl,
        sourceSite,
        status: "SUCCEEDED",
        triggerType: "MANUAL",
        attemptCount: 1,
        maxAttempts: 3,
        startedAt: now,
        finishedAt: now,
        requestPayload: {
          mode: "seed"
        },
        responsePayload: {
          recordsCreated: 4
        }
      }
    });

    return { product, productSource };
  });

  console.log(
    `Seeded product ${result.product.slug ?? result.product.id} from ${result.productSource.sourceSite}`
  );
}

main()
  .catch((error) => {
    console.error("Prisma seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
