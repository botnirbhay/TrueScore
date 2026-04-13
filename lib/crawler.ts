import { chromium, type BrowserContext, type Page } from "playwright";

import { normalizeBrand, normalizeProductTitle, normalizeSku, parseProductMetadataFromHtml } from "@/lib/parser";
import { findAllowlistedSourceByDomain, getAllowlistedSources } from "@/lib/source-allowlist";
import type {
  CollectedOffer,
  CollectedReviewSnippet,
  CollectedSourcePage,
  CollectibleProductInput,
  SourceSearchConfig
} from "@/types/entities";

const REQUEST_DELAY_MS = 900;
const SEARCH_RESULT_LIMIT = 10;
const REVIEW_TEXT_MIN_LENGTH = 60;
const MAX_REVIEW_SNIPPETS_PER_PAGE = 5;
const MAX_SEARCH_QUERIES = 2;
const BLOCKED_PAGE_MARKERS = ["sign in", "log in", "subscribe to continue", "paywall", "access denied", "captcha"];
const IGNORED_SEARCH_HOSTS = new Set([
  "duckduckgo.com",
  "html.duckduckgo.com",
  "www.duckduckgo.com",
  "google.com",
  "www.google.com",
  "bing.com",
  "www.bing.com",
  "youtube.com",
  "www.youtube.com",
  "facebook.com",
  "www.facebook.com",
  "instagram.com",
  "www.instagram.com",
  "pinterest.com",
  "www.pinterest.com",
  "x.com",
  "twitter.com",
  "www.x.com",
  "www.twitter.com"
]);
const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "your",
  "price",
  "review",
  "reviews",
  "buy",
  "shop",
  "sale",
  "best",
  "new"
]);
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

type SearchResult = {
  url: string;
  title: string;
};

type CrawlOptions = {
  maxSources?: number;
};

type ParsedProductPage = ReturnType<typeof parseProductMetadataFromHtml>;

type ProductMatchResult = {
  accepted: boolean;
  score: number;
  reason: string;
  source: SourceSearchConfig | null;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function tokenize(value: string | null | undefined) {
  return new Set(
    (normalizeTextForDedup(value ?? "") || "")
      .split(" ")
      .filter((part) => part.length >= 3 && !STOP_WORDS.has(part))
  );
}

function tokenOverlap(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let shared = 0;

  for (const token of left) {
    if (right.has(token)) {
      shared += 1;
    }
  }

  return shared / Math.max(left.size, right.size);
}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isSameHostname(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) {
    return false;
  }

  return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`);
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

  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]).toFixed(2) : null;
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

function isSearchResultCandidate(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (!/^https?:$/i.test(parsed.protocol)) {
      return false;
    }

    if (IGNORED_SEARCH_HOSTS.has(hostname) || isLikelyBlockedPath(url)) {
      return false;
    }

    if (/\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(parsed.pathname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function decodeSearchEngineUrl(url: string) {
  try {
    const parsed = new URL(url);
    const uddg = parsed.searchParams.get("uddg");

    if (uddg) {
      return decodeURIComponent(uddg);
    }

    return url;
  } catch {
    return url;
  }
}

function extractPageKind(url: string, source: SourceSearchConfig | null, offers: CollectedOffer[], reviews: CollectedReviewSnippet[]) {
  if (offers.length > 0) {
    return "offer" as const;
  }

  if (reviews.length > 0) {
    return "review" as const;
  }

  return source?.kind ?? "offer";
}

function isSourceUrlAllowed(url: string, source: SourceSearchConfig) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const matchesDomain =
      hostname === source.domain || hostname.endsWith(`.${source.domain}`) || source.aliases?.includes(hostname);

    if (!matchesDomain) {
      return false;
    }

    if (source.allowedPathPrefixes?.length) {
      const matchesPrefix = source.allowedPathPrefixes.some((prefix) => parsed.pathname.startsWith(prefix));
      if (!matchesPrefix) {
        return false;
      }
    }

    if (source.blockedPathKeywords?.some((keyword) => `${parsed.pathname}${parsed.search}`.includes(keyword))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function looksLikeProductPath(url: string) {
  try {
    const parsed = new URL(url);
    const target = `${parsed.pathname}${parsed.search}`.toLowerCase();
    return [
      "/product",
      "/products",
      "/dp/",
      "/gp/product/",
      "/p/",
      "/itm/",
      "/item/",
      "/pd/",
      "/buy/"
    ].some((part) => target.includes(part));
  } catch {
    return false;
  }
}

function isCandidateUrlRelevant(url: string, originalHostname: string | null) {
  const hostname = extractDomain(url);

  if (!hostname || !isSearchResultCandidate(url)) {
    return false;
  }

  const allowlisted = findAllowlistedSourceByDomain(hostname);

  if (allowlisted) {
    return isSourceUrlAllowed(url, allowlisted);
  }

  if (isSameHostname(hostname, originalHostname)) {
    return true;
  }

  return looksLikeProductPath(url);
}

function buildSearchQuery(product: CollectibleProductInput) {
  if (product.searchQuery?.trim()) {
    return product.searchQuery.trim();
  }

  const parts = [
    product.brand ?? product.normalizedBrand ?? null,
    product.title ?? product.normalizedTitle ?? null,
    product.normalizedSku ?? null
  ]
    .filter(Boolean)
    .map((part) => normalizeWhitespace(part)?.replace(/\b(price|review|reviews)\b/gi, "") ?? "")
    .filter(Boolean);

  const query = [...new Set(parts.join(" ").split(/\s+/).filter(Boolean))].join(" ");
  return normalizeWhitespace(`${query} price review`) ?? product.originalUrl;
}

function buildSearchQueries(product: CollectibleProductInput) {
  const base = buildSearchQuery(product);
  const title = normalizeWhitespace(product.title ?? product.normalizedTitle ?? "");
  const sku = normalizeWhitespace(product.normalizedSku ?? "");
  const queries = [
    base,
    normalizeWhitespace([product.brand, title, sku, "buy price reviews"].filter(Boolean).join(" "))
  ].filter((value): value is string => Boolean(value));

  return [...new Set(queries)].slice(0, MAX_SEARCH_QUERIES);
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

async function searchWeb(context: BrowserContext, query: string) {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const page = await openPage(context, searchUrl);

  try {
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

    for (const entry of anchors) {
      const resolvedUrl = decodeSearchEngineUrl(entry.url);

      if (!isSearchResultCandidate(resolvedUrl)) {
        continue;
      }

      if (!unique.has(resolvedUrl)) {
        unique.set(resolvedUrl, {
          url: resolvedUrl,
          title: normalizeWhitespace(entry.title) ?? resolvedUrl
        });
      }

      if (unique.size >= SEARCH_RESULT_LIMIT) {
        break;
      }
    }

    return [...unique.values()];
  } finally {
    await page.close();
  }
}

function safeParseProductMetadata(html: string, url: string) {
  try {
    return parseProductMetadataFromHtml(html, url);
  } catch {
    return null;
  }
}

function buildMatchResult(
  product: CollectibleProductInput,
  url: string,
  searchTitle: string,
  parsed: ParsedProductPage | null
): ProductMatchResult {
  const source = findAllowlistedSourceByDomain(extractDomain(url) ?? "");
  const originalHostname = product.sourceSite ?? extractDomain(product.originalUrl);
  const expectedBrand = normalizeBrand(product.normalizedBrand ?? product.brand ?? "");
  const expectedSku = normalizeSku(product.normalizedSku ?? "");
  const expectedTitleTokens = tokenize(product.normalizedTitle ?? product.title ?? searchTitle);
  const candidateBrand = normalizeBrand(parsed?.brand ?? "");
  const candidateSku = normalizeSku(parsed?.sku ?? "");
  const candidateTitleTokens = tokenize(parsed?.normalizedTitle ?? parsed?.title ?? searchTitle);
  const overlap = tokenOverlap(expectedTitleTokens, candidateTitleTokens);
  const sameOriginalHost = isSameHostname(extractDomain(url), originalHostname);
  const brandMatch = Boolean(expectedBrand && candidateBrand && (candidateBrand.includes(expectedBrand) || expectedBrand.includes(candidateBrand)));
  const brandConflict = Boolean(expectedBrand && candidateBrand && !brandMatch);
  const skuMatch = Boolean(expectedSku && candidateSku && (candidateSku === expectedSku || candidateSku.includes(expectedSku)));

  let score = 0;
  const reasons: string[] = [];

  if (sameOriginalHost) {
    score += 0.24;
    reasons.push("same-host");
  }

  if (source) {
    score += 0.12;
    reasons.push(`allowlisted:${source.key}`);
  }

  if (brandMatch) {
    score += 0.22;
    reasons.push("brand-match");
  }

  if (brandConflict) {
    score -= 0.45;
    reasons.push("brand-conflict");
  }

  if (skuMatch) {
    score += 0.42;
    reasons.push("sku-match");
  }

  if (overlap > 0) {
    score += Math.min(0.42, overlap * 0.7);
    reasons.push(`title-overlap:${overlap.toFixed(2)}`);
  }

  if ((parsed?.price && parsed.metadata.currency) || parsed?.ratingValue !== null) {
    score += 0.08;
    reasons.push("structured-signals");
  }

  const accepted = skuMatch || (score >= 0.5 && !brandConflict);

  return {
    accepted,
    score: clamp(score, 0, 1),
    reason: reasons.join(", ") || "insufficient-match",
    source
  };
}

async function extractReviewSnippets(
  page: Page,
  sourceUrl: string,
  parsed: ParsedProductPage | null
): Promise<CollectedReviewSnippet[]> {
  const sourceSite = extractDomain(sourceUrl) ?? "unknown";
  const collectedAt = new Date().toISOString();
  const candidates = await page.$$eval(
    "article, [data-review-id], [itemprop='review'], .review, .review-content, .ugc-review, .review-text, p",
    (nodes: Element[]) =>
      nodes
        .map((node) => {
          const element = node as HTMLElement;
          const title =
            element.querySelector("h1, h2, h3, strong")?.textContent?.trim() ??
            element.getAttribute("data-title") ??
            null;
          const author =
            element.querySelector("[itemprop='author'], .author, .reviewer, [data-testid='author']")?.textContent?.trim() ??
            null;
          const rating =
            element.querySelector("[aria-label*='star'], [itemprop='ratingValue'], .rating")?.textContent?.trim() ??
            element.getAttribute("data-rating") ??
            null;
          const text = element.innerText?.trim() ?? "";

          return { title, author, rating, text };
        })
        .filter((entry) => entry.text.length >= 40)
        .slice(0, 20)
  );

  const results: CollectedReviewSnippet[] = [];

  for (const entry of candidates) {
    const reviewText = normalizeWhitespace(entry.text);

    if (!reviewText || reviewText.length < REVIEW_TEXT_MIN_LENGTH) {
      continue;
    }

    const lowered = reviewText.toLowerCase();
    const looksReviewLike =
      lowered.includes("review") ||
      lowered.includes("stars") ||
      lowered.includes("quality") ||
      lowered.includes("fit") ||
      lowered.includes("material") ||
      lowered.includes("worth");

    if (!looksReviewLike && results.length > 0) {
      continue;
    }

    const ratingValue = parseNumericRating(entry.rating) ?? parsed?.ratingValue ?? null;

    results.push({
      sourceSite,
      sourceUrl,
      authorName: normalizeWhitespace(entry.author),
      reviewTitle: normalizeWhitespace(entry.title) ?? parsed?.title ?? null,
      reviewText,
      ratingValue,
      ratingScale: ratingValue ? 5 : null,
      qualityTags: extractQualityTags(reviewText),
      confidenceScore: clamp(0.46 + (ratingValue ? 0.08 : 0) + Math.min(0.18, reviewText.length / 800), 0.46, 0.88),
      collectedAt
    });

    if (results.length >= MAX_REVIEW_SNIPPETS_PER_PAGE) {
      break;
    }
  }

  if (results.length === 0 && parsed?.description && parsed.ratingValue !== null) {
    const reviewText = normalizeWhitespace(parsed.description);

    if (reviewText && reviewText.length >= REVIEW_TEXT_MIN_LENGTH) {
      results.push({
        sourceSite,
        sourceUrl,
        authorName: null,
        reviewTitle: parsed.title,
        reviewText,
        ratingValue: parsed.ratingValue,
        ratingScale: 5,
        qualityTags: extractQualityTags(reviewText),
        confidenceScore: 0.52,
        collectedAt
      });
    }
  }

  return dedupeReviewSnippets(results);
}

async function extractOffersFromPage(
  page: Page,
  sourceUrl: string,
  parsed: ParsedProductPage | null
): Promise<CollectedOffer[]> {
  const sourceSite = extractDomain(sourceUrl) ?? "unknown";
  const bodyText = await pageText(page);
  const price = parsed?.price ? parseMoneyValue(parsed.price) : null;

  if (!price) {
    return [];
  }

  const shippingLine =
    bodyText.match(
      /(?:shipping|delivery)[^.\n]{0,50}?(free|\$ ?[\d,.]+|\u00A3 ?[\d,.]+|\u20AC ?[\d,.]+|USD ?[\d,.]+|GBP ?[\d,.]+|EUR ?[\d,.]+)/i
    )?.[0] ?? null;
  const shipping = parseMoneyValue(shippingLine);
  const totalPrice =
    shipping && !Number.isNaN(Number(shipping)) ? (Number(price) + Number(shipping)).toFixed(2) : price;
  const availability =
    bodyText.match(/\b(in stock|out of stock|available|sold out|preorder|pre-order|ships today)\b/i)?.[1] ?? null;
  const confidenceScore = clamp(
    0.52 + Math.min(0.24, (parsed?.metadata.extractionSignals.length ?? 1) * 0.05) + (shipping !== null ? 0.04 : 0),
    0.52,
    0.92
  );

  return [
    {
      sourceSite,
      sourceUrl,
      merchantName: parsed?.brand ?? sourceSite,
      offerUrl: sourceUrl,
      currency: parsed?.metadata.currency ?? parseCurrency(parsed?.price),
      price,
      shipping,
      totalPrice,
      availability: availability ? normalizeWhitespace(availability) : null,
      qualityTags: extractQualityTags(bodyText),
      confidenceScore,
      collectedAt: new Date().toISOString()
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

async function crawlCandidate(
  page: Page,
  product: CollectibleProductInput,
  result: SearchResult
): Promise<CollectedSourcePage | null> {
  console.log("[collector] visiting candidate", {
    url: result.url,
    searchTitle: result.title
  });

  await page.goto(result.url, { waitUntil: "domcontentloaded", timeout: 30000 });

  if (await detectBlockedPage(page)) {
    console.warn("[collector] skipped blocked or gated page", { sourceUrl: result.url });
    return null;
  }

  const html = await page.content();
  const parsed = safeParseProductMetadata(html, result.url);
  const match = buildMatchResult(product, result.url, result.title, parsed);

  console.log("[collector] evaluated candidate", {
    url: result.url,
    accepted: match.accepted,
    score: match.score,
    reason: match.reason
  });

  if (!match.accepted) {
    return null;
  }

  const offers = await extractOffersFromPage(page, result.url, parsed);
  const reviews = await extractReviewSnippets(page, result.url, parsed);

  console.log("[collector] extracted page evidence", {
    url: result.url,
    offers: offers.length,
    reviews: reviews.length
  });

  if (reviews.length === 0 && offers.length === 0) {
    return null;
  }

  const sourceSite = extractDomain(result.url) ?? parsed?.metadata.sourceSite ?? "unknown";
  const pageKind = extractPageKind(result.url, match.source, offers, reviews);

  return {
    sourceKey: match.source?.key ?? `dynamic-${sourceSite}`,
    sourceLabel: match.source?.label ?? sourceSite,
    sourceSite,
    sourceUrl: result.url,
    kind: pageKind,
    collectedAt: new Date().toISOString(),
    reviews,
    offers
  };
}

export async function normalizeCollectorInput(input: CollectibleProductInput | string): Promise<CollectibleProductInput> {
  if (typeof input !== "string") {
    return {
      ...input,
      normalizedTitle: input.normalizedTitle ?? (input.title ? normalizeProductTitle(input.title) : null),
      normalizedBrand: input.normalizedBrand ?? (input.brand ? normalizeBrand(input.brand) : null),
      normalizedSku: input.normalizedSku ? normalizeSku(input.normalizedSku) : null,
      sourceSite: input.sourceSite ?? extractDomain(input.originalUrl)
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
          "user-agent": "TrueScoreCollector/0.2 (+https://truescore.local)"
        },
        cache: "no-store"
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
        normalizedBrand: parsed.brand ? normalizeBrand(parsed.brand) : null,
        normalizedTitle: parsed.normalizedTitle,
        normalizedSku: parsed.sku ? normalizeSku(parsed.sku) : null,
        searchQuery: buildSearchQuery({
          ...baseInput,
          title: parsed.title,
          normalizedTitle: parsed.normalizedTitle,
          brand: parsed.brand,
          normalizedBrand: parsed.brand ? normalizeBrand(parsed.brand) : null,
          normalizedSku: parsed.sku ? normalizeSku(parsed.sku) : null
        })
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
  const originalHostname = product.sourceSite ?? extractDomain(product.originalUrl);
  const searchQueries = buildSearchQueries(product);
  const candidateMap = new Map<string, SearchResult>();
  const sourcePages: CollectedSourcePage[] = [];
  const maxCandidates = options.maxSources ?? Math.max(8, getAllowlistedSources().length);
  let pagesFound = 0;
  let validMatches = 0;

  candidateMap.set(product.originalUrl, {
    url: product.originalUrl,
    title: product.title ?? product.normalizedTitle ?? product.originalUrl
  });

  const { browser, context } = await createBrowserContext();

  try {
    for (const query of searchQueries) {
      console.log("[collector] search query", { query });
      const results = await searchWeb(context, query);
      pagesFound += results.length;

      console.log("[collector] search results", {
        query,
        count: results.length
      });

      for (const result of results) {
        if (!isCandidateUrlRelevant(result.url, originalHostname)) {
          continue;
        }

        if (!candidateMap.has(result.url)) {
          candidateMap.set(result.url, result);
        }

        if (candidateMap.size >= maxCandidates) {
          break;
        }
      }

      if (candidateMap.size >= maxCandidates) {
        break;
      }

      await delay(REQUEST_DELAY_MS);
    }

    for (const result of candidateMap.values()) {
      await delay(REQUEST_DELAY_MS);
      const detailPage = await context.newPage();

      try {
        const collected = await crawlCandidate(detailPage, product, result);
        if (collected) {
          sourcePages.push(collected);
          validMatches += 1;
        }
      } catch (error) {
        console.error("[collector] candidate crawl failed", { url: result.url, error });
      } finally {
        await detailPage.close();
      }
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

  console.log("[collector] run summary", {
    searchQueries,
    pagesFound,
    validMatches,
    offerCount: dedupedPages.reduce((sum, page) => sum + page.offers.length, 0),
    reviewCount: dedupedPages.reduce((sum, page) => sum + page.reviews.length, 0)
  });

  return {
    product: {
      ...product,
      searchQuery: searchQueries[0] ?? product.searchQuery ?? null
    },
    searchQueries,
    pagesFound,
    validMatches,
    sourcesCollected: dedupedPages,
    reviewCount: dedupedPages.reduce((sum, page) => sum + page.reviews.length, 0),
    offerCount: dedupedPages.reduce((sum, page) => sum + page.offers.length, 0),
    sourcesVisited: dedupedPages.length
  };
}
