import { chromium, type BrowserContext, type Page } from "playwright";

import { normalizeProductTitle, parseProductMetadataFromHtml } from "@/lib/parser";
import { getAllowlistedSources } from "@/lib/source-allowlist";
import type {
  CollectedOffer,
  CollectedReviewSnippet,
  CollectedSourcePage,
  CollectibleProductInput,
  SourceSearchConfig
} from "@/types/entities";

const REQUEST_DELAY_MS = 1200;
const SEARCH_RESULT_LIMIT = 2;
const REVIEW_TEXT_MIN_LENGTH = 60;
const QUALITY_KEYWORDS = [
  "quality",
  "durable",
  "durability",
  "comfortable",
  "comfort",
  "fit",
  "material",
  "build",
  "cheap",
  "premium",
  "sturdy",
  "soft",
  "battery",
  "performance"
];
const BLOCKED_PAGE_MARKERS = ["sign in", "log in", "subscribe to continue", "paywall", "access denied", "captcha"];

type SearchResult = {
  url: string;
  title: string;
};

type CrawlOptions = {
  maxSources?: number;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function normalizeTextForDedup(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function extractQualityTags(text: string) {
  const haystack = text.toLowerCase();
  return QUALITY_KEYWORDS.filter((keyword) => haystack.includes(keyword));
}

function parseNumericRating(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function parseMoneyValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (/free/i.test(value)) {
    return "0.00";
  }

  const match = value.match(/(\d[\d,.]*)/);
  return match ? match[1].replace(/,/g, "") : null;
}

function parseCurrency(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value.includes("$")) {
    return "USD";
  }

  if (value.includes("\u00A3")) {
    return "GBP";
  }

  if (value.includes("\u20AC")) {
    return "EUR";
  }

  const code = value.match(/\b([A-Z]{3})\b/);
  return code?.[1] ?? null;
}

function isBlockedText(text: string) {
  const lowered = text.toLowerCase();
  return BLOCKED_PAGE_MARKERS.some((marker) => lowered.includes(marker));
}

function isLikelyBlockedPath(url: string) {
  const lowered = url.toLowerCase();
  return lowered.includes("/login") || lowered.includes("/signin") || lowered.includes("/account");
}

function isSourceUrlAllowed(url: string, source: SourceSearchConfig) {
  try {
    const parsed = new URL(url);

    if (!(parsed.hostname === source.domain || parsed.hostname.endsWith(`.${source.domain}`))) {
      return false;
    }

    if (!source.allowedPathPrefixes || source.allowedPathPrefixes.length === 0) {
      return true;
    }

    return source.allowedPathPrefixes.some((prefix) => parsed.pathname.startsWith(prefix));
  } catch {
    return false;
  }
}

function buildSearchQuery(product: CollectibleProductInput) {
  const parts = [
    product.normalizedBrand ?? product.brand ?? null,
    product.normalizedTitle ?? product.title ?? null,
    product.normalizedSku ?? null
  ].filter(Boolean);

  return parts.join(" ").trim() || product.originalUrl;
}

async function createBrowserContext() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
  });

  return { browser, context };
}

async function openPage(context: BrowserContext, url: string) {
  const page = await context.newPage();
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 30000
  });
  return page;
}

async function extractSearchResults(page: Page, source: SourceSearchConfig) {
  const anchors = await page.$$eval(
    "a",
    (links: Element[]) =>
      links
        .map((link) => {
          const anchor = link as HTMLAnchorElement;
          return {
            url: anchor.href,
            title: anchor.textContent?.trim() ?? ""
          };
        })
        .filter((entry) => Boolean(entry.url) && Boolean(entry.title))
  );

  const unique = new Map<string, SearchResult>();

  for (const result of anchors) {
    if (!isSourceUrlAllowed(result.url, source) || isLikelyBlockedPath(result.url)) {
      continue;
    }

    if (!unique.has(result.url)) {
      unique.set(result.url, result);
    }

    if (unique.size >= SEARCH_RESULT_LIMIT) {
      break;
    }
  }

  return [...unique.values()];
}

async function pageText(page: Page) {
  return normalizeWhitespace(await page.locator("body").innerText().catch(() => "")) ?? "";
}

async function detectBlockedPage(page: Page) {
  const currentUrl = page.url();

  if (isLikelyBlockedPath(currentUrl)) {
    return true;
  }

  const text = await pageText(page);
  return isBlockedText(text);
}

async function extractReviewSnippets(page: Page, sourceUrl: string): Promise<CollectedReviewSnippet[]> {
  const sourceSite = extractDomain(sourceUrl) ?? "unknown";
  const collectedAt = new Date().toISOString();

  const candidates = await page.$$eval(
    "article, [data-review-id], [itemprop='review'], .review, .review-content",
    (nodes: Element[]) =>
      nodes
        .map((node) => {
          const element = node as HTMLElement;
          const title =
            element.querySelector("h1, h2, h3, strong")?.textContent?.trim() ??
            element.getAttribute("data-title") ??
            null;
          const author =
            element.querySelector("[itemprop='author'], .author, .reviewer")?.textContent?.trim() ?? null;
          const rating =
            element.querySelector("[aria-label*='star'], [itemprop='ratingValue'], .rating")?.textContent?.trim() ??
            element.getAttribute("data-rating") ??
            null;
          const text = element.innerText?.trim() ?? "";

          return { title, author, rating, text };
        })
        .filter((entry) => entry.text.length >= 40)
        .slice(0, 8)
  );

  const results: CollectedReviewSnippet[] = [];

  for (const entry of candidates) {
    const reviewText = normalizeWhitespace(entry.text);

    if (!reviewText || reviewText.length < REVIEW_TEXT_MIN_LENGTH) {
      continue;
    }

    const ratingValue = parseNumericRating(entry.rating);

    results.push({
      sourceSite,
      sourceUrl,
      authorName: normalizeWhitespace(entry.author),
      reviewTitle: normalizeWhitespace(entry.title),
      reviewText,
      ratingValue,
      ratingScale: ratingValue ? 5 : null,
      qualityTags: extractQualityTags(reviewText),
      confidenceScore: 0.62,
      collectedAt
    });
  }

  return dedupeReviewSnippets(results);
}

async function extractOffersFromPage(page: Page, sourceUrl: string): Promise<CollectedOffer[]> {
  const sourceSite = extractDomain(sourceUrl) ?? "unknown";
  const collectedAt = new Date().toISOString();
  const html = await page.content();
  const metadata = parseProductMetadataFromHtml(html, sourceUrl);
  const bodyText = await pageText(page);
  const shippingLine =
    bodyText.match(
      /(?:shipping|delivery)[^.\n]{0,40}?(free|\$ ?[\d,.]+|\u00A3 ?[\d,.]+|\u20AC ?[\d,.]+)/i
    )?.[0] ?? null;
  const availability =
    bodyText.match(/\b(in stock|out of stock|available|sold out|preorder|pre-order)\b/i)?.[1] ?? null;

  if (!metadata.price) {
    return [];
  }

  const parsedPrice = parseMoneyValue(metadata.price);

  if (!parsedPrice) {
    return [];
  }

  const shipping = parseMoneyValue(shippingLine);
  const totalPrice =
    shipping && !Number.isNaN(Number(shipping)) ? (Number(parsedPrice) + Number(shipping)).toFixed(2) : parsedPrice;

  return [
    {
      sourceSite,
      sourceUrl,
      merchantName: metadata.brand ?? sourceSite,
      offerUrl: sourceUrl,
      currency: metadata.metadata.currency ?? parseCurrency(metadata.price),
      price: parsedPrice,
      shipping,
      totalPrice,
      availability: availability ? normalizeWhitespace(availability) : null,
      qualityTags: extractQualityTags(bodyText),
      confidenceScore: 0.68,
      collectedAt
    }
  ];
}

function dedupeReviewSnippets(items: CollectedReviewSnippet[]) {
  const unique = new Map<string, CollectedReviewSnippet>();

  for (const item of items) {
    const key = `${item.sourceSite}:${normalizeTextForDedup(item.reviewText)}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return [...unique.values()];
}

function dedupeOffers(items: CollectedOffer[]) {
  const unique = new Map<string, CollectedOffer>();

  for (const item of items) {
    const key = `${item.sourceSite}:${item.offerUrl}:${item.price ?? "na"}:${item.shipping ?? "na"}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return [...unique.values()];
}

async function crawlSource(page: Page, source: SourceSearchConfig, result: SearchResult): Promise<CollectedSourcePage | null> {
  console.log("[collector] visiting source page", {
    source: source.key,
    sourceUrl: result.url
  });

  await page.goto(result.url, { waitUntil: "domcontentloaded", timeout: 30000 });

  if (await detectBlockedPage(page)) {
    console.warn("[collector] skipped blocked or gated page", { sourceUrl: result.url });
    return null;
  }

  const reviews = source.kind === "review" ? await extractReviewSnippets(page, result.url) : [];
  const offers = source.kind === "offer" ? await extractOffersFromPage(page, result.url) : [];

  if (reviews.length === 0 && offers.length === 0) {
    console.warn("[collector] no structured data extracted", { sourceUrl: result.url });
    return null;
  }

  return {
    sourceKey: source.key,
    sourceLabel: source.label,
    sourceSite: extractDomain(result.url) ?? source.domain,
    sourceUrl: result.url,
    kind: source.kind,
    collectedAt: new Date().toISOString(),
    reviews,
    offers
  };
}

export async function normalizeCollectorInput(input: CollectibleProductInput | string): Promise<CollectibleProductInput> {
  if (typeof input !== "string") {
    return {
      ...input,
      normalizedTitle: input.normalizedTitle ?? (input.title ? normalizeProductTitle(input.title) : null)
    };
  }

  const originalUrl = input.trim();

  if (/^https?:\/\//i.test(originalUrl)) {
    const baseInput: CollectibleProductInput = {
      originalUrl,
      normalizedTitle: null,
      title: null,
      brand: null,
      normalizedBrand: null,
      normalizedSku: null,
      sourceSite: extractDomain(originalUrl)
    };

    try {
      const response = await fetch(originalUrl, {
        headers: {
          "user-agent": "TrueScoreCollector/0.1 (+https://truescore.local)"
        }
      });

      if (!response.ok) {
        return baseInput;
      }

      const html = await response.text();
      const parsed = parseProductMetadataFromHtml(html, originalUrl);

      return {
        ...baseInput,
        title: parsed.title,
        brand: parsed.brand,
        normalizedBrand: parsed.brand ? parsed.brand.trim() : null,
        normalizedTitle: parsed.normalizedTitle
      };
    } catch {
      return baseInput;
    }
  }

  return JSON.parse(originalUrl) as CollectibleProductInput;
}

export async function collectFromAllowlistedSources(
  input: CollectibleProductInput | string,
  options: CrawlOptions = {}
) {
  const product = await normalizeCollectorInput(input);
  const query = buildSearchQuery(product);
  const sources = getAllowlistedSources().slice(0, options.maxSources ?? getAllowlistedSources().length);
  const sourcePages: CollectedSourcePage[] = [];
  const { browser, context } = await createBrowserContext();

  try {
    for (const source of sources) {
      console.log("[collector] searching source", { source: source.key, query });

      const searchPage = await openPage(context, source.searchUrl(query));

      try {
        if (await detectBlockedPage(searchPage)) {
          console.warn("[collector] skipped blocked search page", { source: source.key });
          continue;
        }

        const results = await extractSearchResults(searchPage, source);
        console.log("[collector] search results", { source: source.key, count: results.length });

        for (const result of results) {
          await delay(REQUEST_DELAY_MS);
          const detailPage = await context.newPage();

          try {
            const collected = await crawlSource(detailPage, source, result);
            if (collected) {
              sourcePages.push(collected);
            }
          } catch (error) {
            console.error("[collector] source crawl failed", { source: source.key, url: result.url, error });
          } finally {
            await detailPage.close();
          }
        }
      } finally {
        await searchPage.close();
      }

      await delay(REQUEST_DELAY_MS);
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const dedupedPages = sourcePages.map((page) => ({
    ...page,
    reviews: dedupeReviewSnippets(page.reviews),
    offers: dedupeOffers(page.offers)
  }));

  return {
    product,
    sourcesCollected: dedupedPages,
    reviewCount: dedupedPages.reduce((sum, page) => sum + page.reviews.length, 0),
    offerCount: dedupedPages.reduce((sum, page) => sum + page.offers.length, 0),
    sourcesVisited: dedupedPages.length
  };
}
