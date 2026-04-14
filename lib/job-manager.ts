import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import { getCachedResult, getCacheKey, setCachedResult } from "@/lib/cache";
import { buildSearchQuery, collectFromAllowlistedSources } from "@/lib/crawler";
import { buildFallbackAnalysisResult, buildResultsModelFromEvidence } from "@/lib/mock-results";
import { normalizeProductUrl, parseProductMetadataFromHtml } from "@/lib/parser";
import { prisma } from "@/lib/prisma";
import { isValidHttpUrl } from "@/lib/utils";
import type { AnalysisResult, ProcessingJob, ResultsViewModel } from "@/types";
import type { CollectibleProductInput } from "@/types/entities";

const jobs = new Map<string, ProcessingJob>();
const urlToJobId = new Map<string, string>();

function now() {
  return new Date().toISOString();
}

function toPrismaJson(value: Record<string, unknown> | null) {
  if (!value) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function createJob(url: string, overrides: Partial<ProcessingJob> = {}) {
  const job: ProcessingJob = {
    id: randomUUID(),
    url,
    status: "queued",
    createdAt: now(),
    updatedAt: now(),
    message: "Job queued.",
    cached: false,
    error: null,
    result: null,
    ...overrides
  };

  jobs.set(job.id, job);
  urlToJobId.set(getCacheKey(url), job.id);
  return job;
}

function updateJob(jobId: string, updates: Partial<ProcessingJob>) {
  const current = jobs.get(jobId);
  if (!current) {
    return null;
  }

  const next: ProcessingJob = {
    ...current,
    ...updates,
    updatedAt: now()
  };

  jobs.set(jobId, next);
  return next;
}

export function getJob(jobId: string) {
  return jobs.get(jobId) ?? null;
}

async function persistCrawlJob(url: string, status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED") {
  try {
    const crawlJob = await prisma.crawlJob.create({
      data: {
        originalUrl: url,
        sourceSite: new URL(url).hostname,
        status,
        triggerType: "MANUAL",
        startedAt: status === "RUNNING" ? new Date() : null
      }
    });

    return crawlJob.id;
  } catch (error) {
    console.warn("[job] crawl job DB persistence unavailable", { url, error });
    return null;
  }
}

async function updatePersistedCrawlJob(
  crawlJobId: string | null,
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED",
  errorMessage?: string
) {
  if (!crawlJobId) {
    return;
  }

  try {
    await prisma.crawlJob.update({
      where: { id: crawlJobId },
      data: {
        status,
        errorMessage: errorMessage ?? null,
        finishedAt: status === "SUCCEEDED" || status === "FAILED" ? new Date() : null
      }
    });
  } catch (error) {
    console.warn("[job] crawl job update unavailable", { crawlJobId, status, error });
  }
}

async function persistProduct(product: AnalysisResult) {
  try {
    const existing = await prisma.product.findFirst({
      where: { originalUrl: product.originalUrl },
      orderBy: { createdAt: "desc" }
    });

    if (existing) {
      const updated = await prisma.product.update({
        where: { id: existing.id },
        data: {
          sourceSite: product.sourceSite,
          title: product.title,
          canonicalUrl: product.canonicalUrl ?? product.originalUrl,
          normalizedTitle: product.normalizedTitle,
          brand: product.brand,
          normalizedBrand:
            typeof product.metadata?.normalizedBrand === "string" ? product.metadata.normalizedBrand : product.brand,
          imageUrl: product.image,
          description: product.description,
          metadata: toPrismaJson(product.metadata),
          crawlStatus: "RUNNING",
          lastCrawledAt: new Date()
        }
      });

      return { ...product, id: updated.id };
    }

    const created = await prisma.product.create({
      data: {
        originalUrl: product.originalUrl,
        canonicalUrl: product.canonicalUrl ?? product.originalUrl,
        sourceSite: product.sourceSite,
        title: product.title,
        normalizedTitle: product.normalizedTitle,
        normalizedBrand:
          typeof product.metadata?.normalizedBrand === "string" ? product.metadata.normalizedBrand : product.brand,
        brand: product.brand,
        imageUrl: product.image,
        description: product.description,
        metadata: toPrismaJson(product.metadata),
        crawlStatus: "RUNNING",
        lastCrawledAt: new Date()
      }
    });

    return { ...product, id: created.id };
  } catch (error) {
    console.warn("[ingest] product DB persistence unavailable", { url: product.originalUrl, error });
    return product;
  }
}

async function fetchAndParseProduct(url: string): Promise<AnalysisResult> {
  const normalizedUrl = normalizeProductUrl(url);

  console.log("[ingest] fetching product page", { productUrl: url, normalizedUrl });

  const response = await fetch(normalizedUrl, {
    headers: {
      "user-agent": "TrueScoreBot/0.1 (+https://truescore.local)"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Fetch failed with status ${response.status}`);
  }

  const html = await response.text();
  let parsed = parseProductMetadataFromHtml(html, normalizedUrl);

  if (parsed.canonicalUrl && parsed.canonicalUrl !== normalizedUrl && parsed.identityConfidence < 0.8) {
    try {
      console.log("[ingest] following canonical product page", {
        requestedUrl: normalizedUrl,
        canonicalUrl: parsed.canonicalUrl
      });

      const canonicalResponse = await fetch(parsed.canonicalUrl, {
        headers: {
          "user-agent": "TrueScoreBot/0.1 (+https://truescore.local)"
        },
        cache: "no-store"
      });

      if (canonicalResponse.ok) {
        const canonicalHtml = await canonicalResponse.text();
        parsed = parseProductMetadataFromHtml(canonicalHtml, parsed.canonicalUrl);
      }
    } catch (error) {
      console.warn("[ingest] canonical fetch failed", {
        requestedUrl: normalizedUrl,
        canonicalUrl: parsed.canonicalUrl,
        error
      });
    }
  }

  console.log("[ingest] parsed metadata", {
    productUrl: url,
    normalizedUrl,
    canonicalUrl: parsed.canonicalUrl,
    rawTitle: parsed.rawTitle,
    title: parsed.title,
    brand: parsed.brand,
    sku: parsed.sku,
    identityConfidence: parsed.identityConfidence,
    sourceSite: parsed.metadata.sourceSite
  });

  return {
    id: `ingested-${randomUUID()}`,
    originalUrl: url,
    canonicalUrl: parsed.canonicalUrl ?? normalizedUrl,
    sourceSite: parsed.metadata.sourceSite,
    title: parsed.title,
    normalizedTitle: parsed.normalizedTitle,
    brand: parsed.brand,
    image: parsed.image,
    description: parsed.description,
    metadata: parsed.metadata,
    createdAt: now()
  };
}

async function runPipeline(jobId: string) {
  const job = getJob(jobId);
  if (!job) {
    return;
  }

  let crawlJobId: string | null = null;

  try {
    updateJob(jobId, {
      status: "queued",
      message: "Product queued for ingestion."
    });
    crawlJobId = await persistCrawlJob(job.url, "PENDING");

    const cached = getCachedResult(job.url);
    if (cached) {
      console.log("[cache] reused cached results during job execution", { url: job.url, jobId });
      updateJob(jobId, {
        status: "complete",
        cached: true,
        message: "Loaded cached result.",
        result: cached
      });
      await updatePersistedCrawlJob(crawlJobId, "SUCCEEDED");
      return;
    }

    const parsedProduct = await fetchAndParseProduct(job.url).catch((error) => {
      console.warn("[ingest] live parse failed, using fallback product", { url: job.url, error });
      return buildFallbackAnalysisResult(job.url);
    });
    const persistedProduct = await persistProduct(parsedProduct);
    const collectorInput: CollectibleProductInput = {
      id: persistedProduct.id,
      originalUrl: persistedProduct.originalUrl,
      canonicalUrl: persistedProduct.canonicalUrl ?? persistedProduct.originalUrl,
      title: persistedProduct.title,
      normalizedTitle: persistedProduct.normalizedTitle,
      brand: persistedProduct.brand,
      normalizedBrand:
        typeof persistedProduct.metadata?.normalizedBrand === "string" ? persistedProduct.metadata.normalizedBrand : persistedProduct.brand,
      rawTitle: typeof persistedProduct.metadata?.rawTitle === "string" ? persistedProduct.metadata.rawTitle : persistedProduct.title,
      identityConfidence:
        typeof persistedProduct.metadata?.identityConfidence === "number" ? persistedProduct.metadata.identityConfidence : null,
      normalizedSku: typeof persistedProduct.metadata?.sku === "string" ? persistedProduct.metadata.sku : null,
      sourceSite: persistedProduct.sourceSite
    };
    const finalSearchQuery = buildSearchQuery(collectorInput);

    console.log("[ingest] normalized product identity", {
      originalUrl: job.url,
      normalizedUrl: normalizeProductUrl(job.url),
      canonicalUrl: collectorInput.canonicalUrl,
      extractedTitle: collectorInput.title ?? null,
      extractedBrand: collectorInput.brand ?? null,
      extractedSku: collectorInput.normalizedSku ?? null,
      identityConfidence: collectorInput.identityConfidence ?? null,
      finalSearchQuery
    });

    updateJob(jobId, {
      status: "crawling",
      message: "Collecting review and offer evidence."
    });
    await updatePersistedCrawlJob(crawlJobId, "RUNNING");

    let reviewSnippets = [] as ResultsViewModel["reviewSnippets"];
    let offers = [] as ResultsViewModel["offers"];
    let warning: string | null = null;

    try {
      console.log("[crawler] starting collector pipeline", { url: job.url, jobId });
      const collected = await collectFromAllowlistedSources({
        ...collectorInput,
        searchQuery: finalSearchQuery
      });

      reviewSnippets = collected.sourcesCollected.flatMap((page) => page.reviews);
      offers = collected.sourcesCollected.flatMap((page) => page.offers);

      console.log("[crawler] collected evidence", {
        url: job.url,
        reviews: reviewSnippets.length,
        offers: offers.length,
        visited: collected.sourcesVisited,
        searchQueries: collected.searchQueries,
        pagesFound: collected.pagesFound,
        validMatches: collected.validMatches
      });

      if (reviewSnippets.length === 0 && offers.length === 0) {
        warning = "Crawler returned no structured evidence. Showing partial product metadata with low confidence.";
      }
    } catch (error) {
      console.warn("[crawler] collector failed; returning partial live metadata only", { url: job.url, error });
      warning = "Crawler failed in this environment. Showing partial live metadata with low confidence.";
    }

    updateJob(jobId, {
      status: "scoring",
      message: "Running trust scoring."
    });

    console.log("[scoring] scoring collected evidence", {
      url: job.url,
      reviews: reviewSnippets.length,
      offers: offers.length
    });

    const result = buildResultsModelFromEvidence(persistedProduct, reviewSnippets, offers);

    setCachedResult(job.url, result);

    updateJob(jobId, {
      status: "complete",
      message: warning ?? "Results ready.",
      result
    });

    await updatePersistedCrawlJob(crawlJobId, "SUCCEEDED");
    console.log("[delivery] result ready", { jobId, url: job.url });
  } catch (error) {
    console.error("[job] pipeline failed", { jobId, url: job.url, error });
    updateJob(jobId, {
      status: "failed",
      message: "Processing failed.",
      error: error instanceof Error ? error.message : "Unknown processing error."
    });
    await updatePersistedCrawlJob(crawlJobId, "FAILED", error instanceof Error ? error.message : "Unknown processing error.");
  }
}

export function createOrReuseJob(url: string) {
  if (!isValidHttpUrl(url)) {
    throw new Error("Enter a valid URL starting with http:// or https://.");
  }

  const normalizedUrl = normalizeProductUrl(url);
  const cached = getCachedResult(normalizedUrl);
  if (cached) {
    console.log("[cache] immediate cache hit", { url, normalizedUrl });
    return createJob(normalizedUrl, {
      status: "complete",
      cached: true,
      message: "Loaded cached result.",
      result: cached
    });
  }

  const cacheKey = getCacheKey(normalizedUrl);
  const activeJobId = urlToJobId.get(cacheKey);
  const activeJob = activeJobId ? jobs.get(activeJobId) : null;

  if (activeJob && activeJob.status !== "failed" && activeJob.status !== "complete") {
    console.log("[job] reusing active job", { url, normalizedUrl, jobId: activeJob.id, status: activeJob.status });
    return activeJob;
  }

  const job = createJob(normalizedUrl);
  console.log("[job] created new job", { url, normalizedUrl, jobId: job.id });
  void runPipeline(job.id);
  return job;
}

