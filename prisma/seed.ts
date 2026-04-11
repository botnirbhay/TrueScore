import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.upsert({
    where: {
      slug: "everlane-organic-cotton-crew"
    },
    update: {
      updatedAt: new Date()
    },
    create: {
      originalUrl: "https://www.everlane.com/products/mens-organic-cotton-crew-heather-grey",
      canonicalUrl: "https://www.everlane.com/products/mens-organic-cotton-crew-heather-grey",
      slug: "everlane-organic-cotton-crew",
      sourceSite: "everlane.com",
      title: "The Organic Cotton Crew",
      brand: "Everlane",
      imageUrl: "https://images.examplecdn.com/everlane/organic-cotton-crew.jpg",
      normalizedBrand: "Everlane",
      normalizedTitle: "Organic Cotton Crew",
      normalizedSku: "EV-OC-CREW-HGRY",
      normalizedCategory: "apparel",
      metadata: {
        sourceSite: "everlane.com",
        currency: "USD",
        fetchedAt: new Date().toISOString(),
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
      lastCrawledAt: new Date(),
      productSources: {
        create: {
          sourceSite: "everlane.com",
          sourceUrl: "https://www.everlane.com/products/mens-organic-cotton-crew-heather-grey",
          pageType: "PRODUCT_PAGE",
          sourceBrand: "Everlane",
          sourceTitle: "The Organic Cotton Crew",
          sourceSku: "EV-OC-CREW-HGRY",
          sourceCategory: "tops",
          availability: "in_stock",
          qualityTags: ["brand-site", "primary-source"],
          confidenceScore: 0.96,
          lastFetchedAt: new Date(),
          extractedPayload: {
            breadcrumbs: ["Men", "Tops", "Sweatshirts"],
            materials: ["organic cotton"]
          },
          reviewSnippets: {
            create: [
              {
                sourceSite: "everlane.com",
                authorName: "Verified Buyer",
                reviewTitle: "Comfortable daily crew",
                reviewText: "Soft fabric, clean fit, and it held up well after multiple washes.",
                ratingValue: 4.6,
                ratingScale: 5,
                qualityTags: ["comfort", "durability", "fit"],
                sentimentLabel: "positive",
                confidenceScore: 0.84,
                publishedAt: new Date("2025-11-18T00:00:00.000Z")
              }
            ]
          },
          offers: {
            create: [
              {
                sourceSite: "everlane.com",
                merchantName: "Everlane",
                offerUrl: "https://www.everlane.com/products/mens-organic-cotton-crew-heather-grey",
                sku: "EV-OC-CREW-HGRY",
                condition: "new",
                availability: "in_stock",
                currency: "USD",
                price: "68.00",
                shipping: "5.00",
                totalPrice: "73.00",
                qualityTags: ["direct-retailer"],
                confidenceScore: 0.95,
                isPrimary: true
              }
            ]
          },
          scores: {
            create: [
              {
                scoreType: "OVERALL",
                sourceSite: "everlane.com",
                value: 82,
                confidenceScore: 0.88,
                rationale: "Strong primary-source completeness, healthy review signal, and stable pricing.",
                qualityTags: ["good-value", "positive-reviews", "clear-brand-data"]
              }
            ]
          },
          crawlJobs: {
            create: [
              {
                originalUrl: "https://www.everlane.com/products/mens-organic-cotton-crew-heather-grey",
                sourceSite: "everlane.com",
                status: "SUCCEEDED",
                triggerType: "MANUAL",
                attemptCount: 1,
                maxAttempts: 3,
                startedAt: new Date(),
                finishedAt: new Date(),
                requestPayload: {
                  mode: "seed"
                },
                responsePayload: {
                  recordsCreated: 4
                }
              }
            ]
          }
        }
      },
      scores: {
        create: [
          {
            scoreType: "QUALITY",
            sourceSite: "everlane.com",
            value: 79,
            confidenceScore: 0.82,
            rationale: "Material claims and review snippets suggest above-average construction for the segment.",
            qualityTags: ["material-signal", "review-backed"]
          }
        ]
      },
      crawlJobs: {
        create: [
          {
            originalUrl: "https://www.everlane.com/products/mens-organic-cotton-crew-heather-grey",
            sourceSite: "everlane.com",
            status: "SUCCEEDED",
            triggerType: "MANUAL",
            attemptCount: 1,
            maxAttempts: 3,
            startedAt: new Date(),
            finishedAt: new Date()
          }
        ]
      }
    },
    include: {
      productSources: {
        include: {
          reviewSnippets: true,
          offers: true,
          scores: true,
          crawlJobs: true
        }
      },
      scores: true,
      crawlJobs: true
    }
  });

  console.log(`Seeded product ${product.slug ?? product.id}`);
}

main()
  .catch((error) => {
    console.error("Prisma seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
