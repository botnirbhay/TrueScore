import { detectCurrencyCode, normalizeCurrencyCode } from "./currency.ts";

type ParsedProductMetadata = {
  title: string | null;
  rawTitle: string | null;
  normalizedTitle: string | null;
  description: string | null;
  image: string | null;
  price: string | null;
  brand: string | null;
  sku: string | null;
  canonicalUrl: string | null;
  identityConfidence: number;
  ratingValue: number | null;
  reviewCount: number | null;
  metadata: {
    sourceSite: string;
    currency: string | null;
    fetchedAt: string;
    extractionSignals: string[];
    identitySignals: string[];
    rawTitle: string | null;
    description: string | null;
    image: string | null;
    price: string | null;
    brand: string | null;
    sku: string | null;
    canonicalUrl: string | null;
    normalizedBrand: string | null;
    identityConfidence: number;
    ratingValue: number | null;
    reviewCount: number | null;
  };
};

type ProductIdentityCandidate = {
  title?: string | null;
  rawTitle?: string | null;
  description?: string | null;
  image?: string | null;
  brand?: string | null;
  sku?: string | null;
  canonicalUrl?: string | null;
  identitySignals?: string[];
  extractionSignals?: string[];
};

const TRACKING_QUERY_KEYS = new Set([
  "ref",
  "sr",
  "sp_csd",
  "spm",
  "qid",
  "keywords",
  "dib",
  "dib_tag",
  "psc",
  "pd_rd_r",
  "pd_rd_w",
  "pd_rd_wg",
  "pd_rd_i",
  "pf_rd_p",
  "pf_rd_r",
  "pf_rd_s",
  "pf_rd_t",
  "tag",
  "ascsubtag",
  "tracking",
  "trk",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content"
]);
const QUERY_TITLE_KEYS = ["product", "title", "name", "item", "item_name", "product_name"];
const QUERY_SKU_KEYS = ["sku", "asin", "model", "modelno", "model_no", "itemid", "item_id", "product_id", "pid"];
const GENERIC_PATH_SEGMENTS = new Set([
  "products",
  "product",
  "collections",
  "collection",
  "shop",
  "store",
  "buy",
  "catalog",
  "c",
  "p",
  "ip",
  "itm",
  "item",
  "dp",
  "gp",
  "pd",
  "us",
  "en",
  "en-us",
  "en-in",
  "in"
]);
const QUERY_NOISE_PREFIXES = ["utm_", "pf_rd_", "pd_rd_", "mc_", "ga_", "ref_"];
const QUERY_NOISE_EXACT = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "srsltid",
  "irclickid",
  "clickid",
  "tracking_id",
  "trackingid",
  "source",
  "campaign",
  "campaignid",
  "adid",
  "redirect",
  "redirect_url"
]);
const TITLE_NOISE_PATTERNS = [
  /\bref\s*[:=][^\s|,;]+/gi,
  /\bsr\s*[:=][^\s|,;]+/gi,
  /\bsp[_-]?csd\s*[:=][^\s|,;]+/gi,
  /\bkeywords\s*[:=][^\s|,;]+/gi,
  /\bdib(?:_tag)?\s*[:=][^\s|,;]+/gi,
  /\bqid\s*[:=][^\s|,;]+/gi,
  /\bpsc\s*[:=][^\s|,;]+/gi,
  /\bpd[_-]rd[_a-z]*\s*[:=][^\s|,;]+/gi,
  /\bsponsored\b/gi,
  /\bsearch results?\b/gi,
  /\bsspa\b/gi,
  /\bref sr\b/gi,
  /\bsr \d+ \d+(?: \w+)?\b/gi
];

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x27;/gi, "'");
}

function cleanText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = decodeHtml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

function normalizeWhitespace(value: string | null | undefined) {
  return cleanText(value);
}

function toNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRootSiteLabel(hostname: string) {
  const parts = hostname.replace(/^www\./i, "").split(".");
  return parts.length > 1 ? parts[0] : hostname.replace(/^www\./i, "");
}

function stripUrlNoise(value: string | null | undefined, hostname: string) {
  const cleaned = normalizeWhitespace(value);

  if (!cleaned) {
    return null;
  }

  let next = cleaned;

  for (const pattern of TITLE_NOISE_PATTERNS) {
    next = next.replace(pattern, " ");
  }

  next = next
    .replace(/[?&](?:ref|sr|sp_csd|keywords|dib|qid|psc|pd_rd_[a-z]+)=[^&\s]+/gi, " ")
    .replace(/\b(?:amazon|walmart|ikea|flipkart)(?:\.[a-z.]+)?\s*[:|-]\s*/gi, " ")
    .replace(/\s*[-|:]\s*(?:amazon|walmart|ikea|flipkart)(?:\.[a-z.]+)?(?:\s*:.*)?$/gi, " ");

  const siteLabel = escapeRegExp(getRootSiteLabel(hostname));
  next = next.replace(new RegExp(`\\s*[-|:]\\s*${siteLabel}(?:\\.[a-z.]+)?(?:\\s*:.*)?$`, "i"), " ");

  next = next.replace(/\b(?:buy online|search|sponsored ad)\b/gi, " ");
  return normalizeWhitespace(next);
}

function sanitizeTitleCandidate(value: string | null | undefined, hostname: string) {
  const stripped = stripUrlNoise(value, hostname);

  if (!stripped) {
    return null;
  }

  if (/^(amazon|walmart|ikea|flipkart)(?:\.[a-z.]+)?$/i.test(stripped)) {
    return null;
  }

  if (stripped.length < 4) {
    return null;
  }

  return stripped;
}

function sanitizeBrandCandidate(value: string | null | undefined) {
  const base = normalizeWhitespace(value);

  if (!base) {
    return null;
  }

  const cleaned = base.replace(/\bvisit the\b/gi, "").replace(/\bstore\b/gi, "").replace(/\bofficial\b/gi, "");
  return normalizeWhitespace(cleaned);
}

function toAbsoluteUrl(value: string | null, baseUrl: string) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function stripTrackingParamsFromUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    const keys = [...parsed.searchParams.keys()];

    for (const key of keys) {
      const lowered = key.toLowerCase();
      if (
        TRACKING_QUERY_KEYS.has(lowered) ||
        QUERY_NOISE_EXACT.has(lowered) ||
        QUERY_NOISE_PREFIXES.some((prefix) => lowered.startsWith(prefix))
      ) {
        parsed.searchParams.delete(key);
      }
    }

    parsed.hash = "";
    return parsed.toString();
  } catch {
    return value;
  }
}

function readMetaTag(html: string, attribute: "property" | "name" | "itemprop", key: string) {
  const escapedKey = escapeRegExp(key);
  const patterns = [
    new RegExp(`<meta[^>]*${attribute}=["']${escapedKey}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${escapedKey}["'][^>]*>`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return cleanText(match[1]);
    }
  }

  return null;
}

function readLinkTag(html: string, rel: string) {
  const escapedRel = escapeRegExp(rel);
  const patterns = [
    new RegExp(`<link[^>]*rel=["']${escapedRel}["'][^>]*href=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<link[^>]*href=["']([^"']+)["'][^>]*rel=["']${escapedRel}["'][^>]*>`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return cleanText(match[1]);
    }
  }

  return null;
}

function readTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanText(match?.[1]);
}

function readHeadingText(html: string) {
  const selectors = [
    /<h1[^>]*id=["']productTitle["'][^>]*>([\s\S]*?)<\/h1>/i,
    /<span[^>]*id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i,
    /<h1[^>]*data-testid=["']product-title["'][^>]*>([\s\S]*?)<\/h1>/i,
    /<h1[^>]*>([\s\S]*?)<\/h1>/i
  ];

  for (const pattern of selectors) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return cleanText(match[1]);
    }
  }

  return null;
}

function readJsonLdObjects(html: string) {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const objects: unknown[] = [];

  for (const match of matches) {
    const raw = match[1].trim();

    try {
      const parsed = JSON.parse(raw) as unknown;
      objects.push(parsed);
    } catch {
      continue;
    }
  }

  return objects.flatMap(flattenJsonLdNode);
}

function flattenJsonLdNode(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap(flattenJsonLdNode);
  }

  if (!value || typeof value !== "object") {
    return [value];
  }

  const record = value as Record<string, unknown>;
  const graph = record["@graph"];

  if (Array.isArray(graph)) {
    return [value, ...graph.flatMap(flattenJsonLdNode)];
  }

  return [value];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readStringValue(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value === "string") {
    return cleanText(value);
  }

  const nested = asRecord(value);

  if (nested && typeof nested.name === "string") {
    return cleanText(nested.name);
  }

  return null;
}

function readNumberValue(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    return toNumber(value);
  }

  return null;
}

function readJsonLdProductData(html: string) {
  const objects = readJsonLdObjects(html);

  for (const item of objects) {
    const record = asRecord(item);

    if (!record) {
      continue;
    }

    const typeValue = record["@type"];
    const typeLabels = Array.isArray(typeValue)
      ? typeValue.filter((entry): entry is string => typeof entry === "string")
      : typeof typeValue === "string"
        ? [typeValue]
        : [];

    if (!typeLabels.some((label) => label.toLowerCase().includes("product"))) {
      continue;
    }

    const offers = asRecord(record.offers);
    const aggregateOffer =
      Array.isArray(record.offers) && record.offers.length > 0 ? asRecord(record.offers[0]) : null;
    const offerRecord = offers ?? aggregateOffer;
    const aggregateRating = asRecord(record.aggregateRating);

    return {
      title: readStringValue(record, "name"),
      rawTitle: readStringValue(record, "name"),
      description: readStringValue(record, "description"),
      brand: readStringValue(record, "brand"),
      sku:
        readStringValue(record, "sku") ??
        readStringValue(record, "mpn") ??
        readStringValue(record, "gtin13") ??
        readStringValue(record, "gtin12") ??
        readStringValue(record, "gtin14"),
      image:
        typeof record.image === "string"
          ? cleanText(record.image)
          : Array.isArray(record.image) && typeof record.image[0] === "string"
            ? cleanText(record.image[0])
            : null,
      price: offerRecord ? readStringValue(offerRecord, "price") : null,
      currency: offerRecord ? readStringValue(offerRecord, "priceCurrency") : null,
      ratingValue: aggregateRating ? readNumberValue(aggregateRating, "ratingValue") : null,
      reviewCount: (aggregateRating ? readNumberValue(aggregateRating, "reviewCount") : null) ?? (aggregateRating ? readNumberValue(aggregateRating, "ratingCount") : null)
    };
  }

  return null;
}

function detectSkuFromHtml(html: string) {
  const metaSku =
    readMetaTag(html, "itemprop", "sku") ??
    readMetaTag(html, "itemprop", "mpn") ??
    readMetaTag(html, "name", "sku") ??
    readMetaTag(html, "name", "mpn");

  if (metaSku) {
    return cleanText(metaSku);
  }

  const regexes = [
    /"sku"\s*:\s*"([^"]+)"/i,
    /"mpn"\s*:\s*"([^"]+)"/i,
    /\bASIN\b[^A-Z0-9]{0,10}([A-Z0-9]{10})/i,
    /\bSKU\b[^A-Z0-9]{0,10}([A-Z0-9-]{4,})/i,
    /\bModel\b[^A-Z0-9]{0,10}([A-Z0-9-]{4,})/i
  ];

  for (const regex of regexes) {
    const match = html.match(regex);
    if (match?.[1]) {
      return cleanText(match[1]);
    }
  }

  return null;
}

function detectRatingFromHtml(html: string) {
  const metaRating =
    readMetaTag(html, "itemprop", "ratingValue") ??
    cleanText(html.match(/"ratingValue"\s*:\s*"?(\\?\d+(?:\.\d+)?)"?/i)?.[1]) ??
    cleanText(html.match(/aria-label=["'][^"']*?(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*5/i)?.[1]);

  return toNumber(metaRating);
}

function detectReviewCountFromHtml(html: string) {
  const metaCount =
    readMetaTag(html, "itemprop", "reviewCount") ??
    cleanText(html.match(/"reviewCount"\s*:\s*"?(\\?\d[\d,]*)"?/i)?.[1]) ??
    cleanText(html.match(/"ratingCount"\s*:\s*"?(\\?\d[\d,]*)"?/i)?.[1]);

  return metaCount ? Math.round(toNumber(metaCount) ?? NaN) || null : null;
}

function detectPriceFromHtml(html: string) {
  const metaPrice =
    readMetaTag(html, "property", "product:price:amount") ??
    readMetaTag(html, "property", "og:price:amount") ??
    readMetaTag(html, "itemprop", "price");

  if (metaPrice) {
    return metaPrice.replace(/[^\d.,-]/g, "");
  }

  const regexes = [
    /"price"\s*:\s*"([\d.,]+)"/i,
    /"price"\s*:\s*([\d.]+)/i,
    /(?:\$|Â£|â‚¬|₹)\s?([\d,.]+)/i
  ];

  for (const regex of regexes) {
    const match = html.match(regex);
    if (match?.[1]) {
      return cleanText(match[1]);
    }
  }

  return null;
}

function detectCurrencyFromHtml(html: string) {
  const detected =
    readMetaTag(html, "property", "product:price:currency") ??
    readMetaTag(html, "property", "og:price:currency") ??
    readMetaTag(html, "itemprop", "priceCurrency") ??
    cleanText(html.match(/"priceCurrency"\s*:\s*"([A-Z]{3})"/i)?.[1]) ??
    detectCurrencyCode(
      cleanText(html.match(/(?:\$|₹|¥|£|€|AED|JPY|INR|EUR|GBP|USD|د\.إ|دإ)[\s\u00A0]*[\d,.]+/i)?.[0]),
      cleanText(html.match(/\b(?:price|mrp|sale price)\b[\s\S]{0,40}?(₹|¥|£|€|\$|AED|JPY|INR|EUR|GBP|USD|د\.إ|دإ)/i)?.[1])
    );

  return normalizeCurrencyCode(detected);
}

function extractHostname(url: string) {
  return new URL(url).hostname.toLowerCase();
}

function isLikelyListingUrl(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return (
      path === "/s" ||
      path.startsWith("/s/") ||
      path.includes("/search") ||
      path.includes("/search/") ||
      path.includes("/browse") ||
      parsed.searchParams.has("k") ||
      parsed.searchParams.has("keywords") ||
      parsed.searchParams.has("q") ||
      parsed.searchParams.has("query")
    );
  } catch {
    return false;
  }
}

function normalizeCandidatePath(url: string, pathname: string) {
  try {
    return new URL(pathname, url).toString();
  } catch {
    return pathname;
  }
}

function extractAmazonAsin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.match(/\b([A-Z0-9]{10})\b/i)?.[1]?.toUpperCase() ?? null;
}

function readQueryParam(url: URL, keys: string[]) {
  for (const key of keys) {
    const exact = url.searchParams.get(key);
    if (exact) {
      return cleanText(exact);
    }

    const lowerKey = key.toLowerCase();
    for (const [entryKey, entryValue] of url.searchParams.entries()) {
      if (entryKey.toLowerCase() === lowerKey && entryValue) {
        return cleanText(entryValue);
      }
    }
  }

  return null;
}

function slugToTitle(value: string | null | undefined) {
  const cleaned = cleanText(value)
    ?.replace(/[-_+/]+/g, " ")
    .replace(/\b(?:ref|dp|gp|product|products|itm|ip|p)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned && cleaned.length >= 4 ? cleaned : null;
}

function isWeakTitleCandidate(value: string | null | undefined) {
  const cleaned = normalizeWhitespace(value);

  if (!cleaned) {
    return true;
  }

  const alphaTokens = cleaned.match(/[a-z]{3,}/gi) ?? [];
  if (alphaTokens.length >= 2) {
    return false;
  }

  if (alphaTokens.length === 1 && cleaned.length >= 12) {
    return false;
  }

  return true;
}

function cleanPathSegment(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const decoded = decodeURIComponent(value)
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .replace(/[%+]/g, " ")
    .trim();
  const lowered = decoded.toLowerCase();

  if (!decoded || GENERIC_PATH_SEGMENTS.has(lowered) || /^[a-z]{2}(?:-[a-z]{2})?$/i.test(decoded) || /^\d{3,}$/.test(decoded)) {
    return null;
  }

  return decoded;
}

function looksLikeIdentifierSegment(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const cleaned = value.replace(/[^A-Za-z0-9-]/g, "");
  if (!/^[A-Z0-9-]{6,}$/i.test(cleaned) || !/\d/.test(cleaned)) {
    return false;
  }

  const titleLikeValue = slugToTitle(value);
  const wordTokens = titleLikeValue?.match(/[a-z]{3,}/gi) ?? [];

  if (wordTokens.length >= 3) {
    return false;
  }

  if (wordTokens.length >= 2 && cleaned.length > 18) {
    return false;
  }

  return !/[aeiou]{3,}/i.test(cleaned);
}

function buildGenericTitleFromUrl(parsed: URL, hostname: string) {
  const segments = parsed.pathname
    .split("/")
    .map((segment) => cleanPathSegment(segment))
    .filter((segment): segment is string => Boolean(segment));
  const candidates: string[] = [];

  if (segments.length > 0) {
    const lastSegment = segments.at(-1) ?? null;
    const previousSegment = segments.length > 1 ? segments.at(-2) ?? null : null;

    if (lastSegment && !looksLikeIdentifierSegment(lastSegment)) {
      candidates.push(lastSegment);
    }

    if (previousSegment && (!lastSegment || looksLikeIdentifierSegment(lastSegment) || isWeakTitleCandidate(lastSegment))) {
      candidates.push(previousSegment);
    }

    if (segments.length >= 2) {
      candidates.push(segments.slice(-2).join(" "));
    }
  }

  const queryTitle = readQueryParam(parsed, QUERY_TITLE_KEYS);
  if (queryTitle) {
    candidates.push(queryTitle);
  }

  for (const candidate of candidates) {
    const title = sanitizeTitleCandidate(titleCaseWords(slugToTitle(candidate)), hostname);
    if (title && !isWeakTitleCandidate(title)) {
      return title;
    }
  }

  for (const candidate of candidates) {
    const title = sanitizeTitleCandidate(titleCaseWords(slugToTitle(candidate)), hostname);
    if (title) {
      return title;
    }
  }

  return null;
}

function inferGenericSkuFromUrl(parsed: URL) {
  const querySku = readQueryParam(parsed, QUERY_SKU_KEYS);
  if (querySku) {
    return querySku;
  }

  const segments = parsed.pathname
    .split("/")
    .map((segment) => cleanPathSegment(segment))
    .filter((segment): segment is string => Boolean(segment));

  for (const segment of [...segments].reverse()) {
    if (looksLikeIdentifierSegment(segment)) {
      return cleanText(segment);
    }
  }

  return null;
}

function titleCaseWords(value: string | null | undefined) {
  const cleaned = normalizeWhitespace(value);

  if (!cleaned) {
    return null;
  }

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferAmazonIdentityFromUrl(originalUrl: string) {
  const parsed = new URL(originalUrl);
  const asin = extractAmazonAsin(originalUrl);
  const slug = parsed.pathname.match(/\/([^/]+)\/dp\/[A-Z0-9]{10}/i)?.[1] ?? null;
  const title = titleCaseWords(slugToTitle(slug));

  return {
    title,
    rawTitle: title,
    sku: asin,
    canonicalUrl: asin ? `${parsed.origin}/dp/${asin}` : stripTrackingParamsFromUrl(originalUrl),
    identityConfidence: asin && title ? 0.52 : asin ? 0.34 : 0.18
  };
}

function inferWalmartIdentityFromUrl(originalUrl: string) {
  const parsed = new URL(originalUrl);
  const sku = parsed.pathname.match(/\/ip\/[^/]+\/(\d+)/i)?.[1] ?? null;
  const slug = parsed.pathname.match(/\/ip\/([^/]+)\/\d+/i)?.[1] ?? null;
  const title = titleCaseWords(slugToTitle(slug));

  return {
    title,
    rawTitle: title,
    sku,
    canonicalUrl: stripTrackingParamsFromUrl(originalUrl),
    identityConfidence: sku && title ? 0.48 : sku ? 0.3 : 0.18
  };
}

function inferIkeaIdentityFromUrl(originalUrl: string) {
  const parsed = new URL(originalUrl);
  const match = parsed.pathname.match(/\/p\/(.+)-([s]?\d{8,10})\/?$/i);
  const title = titleCaseWords(slugToTitle(match?.[1] ?? null));
  const sku = match?.[2] ?? null;

  return {
    title,
    rawTitle: title,
    sku,
    canonicalUrl: stripTrackingParamsFromUrl(originalUrl),
    identityConfidence: sku && title ? 0.5 : sku ? 0.32 : 0.18
  };
}

function inferFlipkartIdentityFromUrl(originalUrl: string) {
  const parsed = new URL(originalUrl);
  const sku = parsed.searchParams.get("pid");
  const slug = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
  const title = titleCaseWords(slugToTitle(slug));

  return {
    title,
    rawTitle: title,
    sku,
    canonicalUrl: stripTrackingParamsFromUrl(originalUrl),
    identityConfidence: sku && title ? 0.46 : sku ? 0.28 : 0.18
  };
}

export function normalizeProductUrl(originalUrl: string) {
  const cleanedUrl = stripTrackingParamsFromUrl(originalUrl) ?? originalUrl;

  try {
    const parsed = new URL(cleanedUrl);
    const hostname = parsed.hostname.toLowerCase();

    if (hostname.includes("amazon.")) {
      const asin = extractAmazonAsin(cleanedUrl);
      if (asin) {
        parsed.pathname = `/dp/${asin}`;
        parsed.search = "";
      }
    } else if (hostname.includes("walmart.")) {
      parsed.search = "";
    } else if (hostname.includes("ikea.")) {
      parsed.search = "";
    } else if (hostname.includes("flipkart.")) {
      const pid = parsed.searchParams.get("pid");
      parsed.search = pid ? `?pid=${pid}` : "";
    }

    parsed.hash = "";
    return parsed.toString();
  } catch {
    return cleanedUrl;
  }
}

export function inferProductIdentityFromUrl(originalUrl: string) {
  try {
    const normalizedUrl = normalizeProductUrl(originalUrl);
    const parsed = new URL(normalizedUrl);
    const hostname = parsed.hostname.toLowerCase();
    const genericTitle = buildGenericTitleFromUrl(parsed, hostname);
    const genericSku = inferGenericSkuFromUrl(parsed);

    const siteSpecific =
      hostname.includes("amazon.")
        ? inferAmazonIdentityFromUrl(originalUrl)
        : hostname.includes("walmart.")
          ? inferWalmartIdentityFromUrl(originalUrl)
          : hostname.includes("ikea.")
            ? inferIkeaIdentityFromUrl(originalUrl)
            : hostname.includes("flipkart.")
              ? inferFlipkartIdentityFromUrl(originalUrl)
              : {
                  title: genericTitle,
                  rawTitle: genericTitle,
                  sku: genericSku,
                  canonicalUrl: stripTrackingParamsFromUrl(normalizedUrl),
                  identityConfidence: genericTitle && genericSku ? 0.42 : genericTitle ? 0.28 : genericSku ? 0.22 : 0.16
                };

    const normalizedTitle = siteSpecific.title ? normalizeProductTitle(siteSpecific.title) : null;
    const normalizedSku = siteSpecific.sku ? normalizeSku(siteSpecific.sku) : null;

    return {
      originalUrl,
      canonicalUrl: siteSpecific.canonicalUrl ?? normalizedUrl,
      sourceSite: hostname,
      title: siteSpecific.title ?? null,
      rawTitle: siteSpecific.rawTitle ?? siteSpecific.title ?? null,
      normalizedTitle,
      brand: null,
      normalizedBrand: null,
      normalizedSku,
      identityConfidence: siteSpecific.identityConfidence
    };
  } catch {
    return {
      originalUrl,
      canonicalUrl: originalUrl,
      sourceSite: null,
      title: null,
      rawTitle: null,
      normalizedTitle: null,
      brand: null,
      normalizedBrand: null,
      normalizedSku: null,
      identityConfidence: 0.12
    };
  }
}

function readAmazonCandidateFromListing(html: string, originalUrl: string): ProductIdentityCandidate | null {
  const origin = new URL(originalUrl).origin;
  const pattern = /<a[^>]+href=["']([^"']*\/dp\/([A-Z0-9]{10})[^"']*)["'][^>]*>([\s\S]{0,400}?)<\/a>/gi;

  for (const match of html.matchAll(pattern)) {
    const snippetWindow = html.slice(Math.max(0, (match.index ?? 0) - 120), Math.min(html.length, (match.index ?? 0) + 520));
    if (/\bsponsored\b/i.test(snippetWindow)) {
      continue;
    }

    const title = sanitizeTitleCandidate(cleanText(match[3]), extractHostname(originalUrl));
    if (!title) {
      continue;
    }

    const asin = match[2].toUpperCase();
    return {
      title,
      rawTitle: title,
      sku: asin,
      canonicalUrl: `${origin}/dp/${asin}`,
      identitySignals: ["amazon-listing-resolve", "canonical", "sku"],
      extractionSignals: ["title", "canonical", "sku"]
    };
  }

  return null;
}

function readWalmartCandidateFromListing(html: string, originalUrl: string): ProductIdentityCandidate | null {
  const pattern = /<a[^>]+href=["']([^"']*\/ip\/[^"']*\/(\d+)[^"']*)["'][^>]*>([\s\S]{0,320}?)<\/a>/gi;

  for (const match of html.matchAll(pattern)) {
    const snippetWindow = html.slice(Math.max(0, (match.index ?? 0) - 120), Math.min(html.length, (match.index ?? 0) + 520));
    if (/\bsponsored\b/i.test(snippetWindow)) {
      continue;
    }

    const title = sanitizeTitleCandidate(cleanText(match[3]), extractHostname(originalUrl));
    if (!title) {
      continue;
    }

    return {
      title,
      rawTitle: title,
      sku: match[2],
      canonicalUrl: normalizeCandidatePath(originalUrl, match[1]),
      identitySignals: ["walmart-listing-resolve", "canonical", "sku"],
      extractionSignals: ["title", "canonical", "sku"]
    };
  }

  return null;
}

function readIkeaCandidateFromListing(html: string, originalUrl: string): ProductIdentityCandidate | null {
  const pattern = /<a[^>]+href=["']([^"']*\/p\/[^"']*-(s?\d{8,10})\/?[^"']*)["'][^>]*>([\s\S]{0,320}?)<\/a>/gi;

  for (const match of html.matchAll(pattern)) {
    const title = sanitizeTitleCandidate(cleanText(match[3]), extractHostname(originalUrl));
    if (!title) {
      continue;
    }

    return {
      title,
      rawTitle: title,
      sku: match[2],
      canonicalUrl: normalizeCandidatePath(originalUrl, match[1]),
      identitySignals: ["ikea-listing-resolve", "canonical", "sku"],
      extractionSignals: ["title", "canonical", "sku"]
    };
  }

  return null;
}

function readFlipkartCandidateFromListing(html: string, originalUrl: string): ProductIdentityCandidate | null {
  const pattern = /<a[^>]+href=["']([^"']*(?:\/p\/|\/itm)[^"']*)["'][^>]*>([\s\S]{0,320}?)<\/a>/gi;

  for (const match of html.matchAll(pattern)) {
    const snippetWindow = html.slice(Math.max(0, (match.index ?? 0) - 120), Math.min(html.length, (match.index ?? 0) + 520));
    if (/\bsponsored\b/i.test(snippetWindow)) {
      continue;
    }

    const title = sanitizeTitleCandidate(cleanText(match[2]), extractHostname(originalUrl));
    if (!title) {
      continue;
    }

    const pid = match[1].match(/[?&]pid=([A-Z0-9]+)/i)?.[1] ?? match[1].match(/\/itm[^/?"]+/i)?.[0]?.replace("/", "") ?? null;

    return {
      title,
      rawTitle: title,
      sku: pid,
      canonicalUrl: normalizeCandidatePath(originalUrl, match[1]),
      identitySignals: ["flipkart-listing-resolve", "canonical", "sku"],
      extractionSignals: ["title", "canonical", "sku"]
    };
  }

  return null;
}

function detectAmazonMetadata(html: string, originalUrl: string): ProductIdentityCandidate {
  const hostname = extractHostname(originalUrl);
  const asin =
    cleanText(html.match(/["']ASIN["']\s*[:=]\s*["']([A-Z0-9]{10})["']/i)?.[1]) ??
    cleanText(html.match(/name=["']ASIN["'][^>]*value=["']([A-Z0-9]{10})["']/i)?.[1]) ??
    extractAmazonAsin(originalUrl);
  const title =
    sanitizeTitleCandidate(cleanText(html.match(/<span[^>]*id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]), hostname) ??
    sanitizeTitleCandidate(readHeadingText(html), hostname);
  const byline = sanitizeBrandCandidate(cleanText(html.match(/<a[^>]*id=["']bylineInfo["'][^>]*>([\s\S]*?)<\/a>/i)?.[1]));
  const listingCandidate = isLikelyListingUrl(originalUrl) || !title ? readAmazonCandidateFromListing(html, originalUrl) : null;
  const canonicalUrl = stripTrackingParamsFromUrl(
    listingCandidate?.canonicalUrl ??
      (readLinkTag(html, "canonical") ? toAbsoluteUrl(readLinkTag(html, "canonical"), originalUrl) : asin ? `${new URL(originalUrl).origin}/dp/${asin}` : null)
  );

  return {
    title: title ?? listingCandidate?.title ?? null,
    rawTitle: title ?? listingCandidate?.rawTitle ?? null,
    brand: byline ?? null,
    sku: asin ?? listingCandidate?.sku ?? null,
    canonicalUrl: canonicalUrl ?? listingCandidate?.canonicalUrl ?? null,
    identitySignals: ["site:amazon", ...(title ? ["title"] : []), ...(byline ? ["brand"] : []), ...(asin ? ["sku"] : []), ...(listingCandidate ? ["listing-resolve"] : [])],
    extractionSignals: ["site-parser", ...(title ? ["title"] : []), ...(asin ? ["sku"] : []), ...(canonicalUrl ? ["canonical"] : [])]
  };
}

function detectWalmartMetadata(html: string, originalUrl: string): ProductIdentityCandidate {
  const hostname = extractHostname(originalUrl);
  const title =
    sanitizeTitleCandidate(cleanText(html.match(/<h1[^>]*data-testid=["']product-title["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1]), hostname) ??
    sanitizeTitleCandidate(readHeadingText(html), hostname);
  const sku =
    cleanText(html.match(/\/ip\/[^/"]*\/(\d+)/i)?.[1]) ??
    cleanText(html.match(/"usItemId"\s*:\s*"(\d+)"/i)?.[1]) ??
    cleanText(html.match(/"itemId"\s*:\s*"(\d+)"/i)?.[1]);
  const brand =
    sanitizeBrandCandidate(readMetaTag(html, "property", "product:brand")) ??
    sanitizeBrandCandidate(cleanText(html.match(/"brand"\s*:\s*"([^"]+)"/i)?.[1]));
  const listingCandidate = isLikelyListingUrl(originalUrl) || !title ? readWalmartCandidateFromListing(html, originalUrl) : null;
  const canonicalUrl = stripTrackingParamsFromUrl(listingCandidate?.canonicalUrl ?? toAbsoluteUrl(readLinkTag(html, "canonical"), originalUrl));

  return {
    title: title ?? listingCandidate?.title ?? null,
    rawTitle: title ?? listingCandidate?.rawTitle ?? null,
    brand: brand ?? null,
    sku: sku ?? listingCandidate?.sku ?? null,
    canonicalUrl: canonicalUrl ?? listingCandidate?.canonicalUrl ?? null,
    identitySignals: ["site:walmart", ...(title ? ["title"] : []), ...(brand ? ["brand"] : []), ...(sku ? ["sku"] : []), ...(listingCandidate ? ["listing-resolve"] : [])],
    extractionSignals: ["site-parser", ...(title ? ["title"] : []), ...(sku ? ["sku"] : []), ...(canonicalUrl ? ["canonical"] : [])]
  };
}

function detectIkeaMetadata(html: string, originalUrl: string): ProductIdentityCandidate {
  const hostname = extractHostname(originalUrl);
  const title =
    sanitizeTitleCandidate(cleanText(html.match(/<span[^>]*data-testid=["']product-name["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]), hostname) ??
    sanitizeTitleCandidate(readHeadingText(html), hostname);
  const sku =
    cleanText(html.match(/-(s?\d{8,10})\/?["']/i)?.[1]) ??
    cleanText(html.match(/\barticle number\b[^0-9]{0,20}(\d{8})/i)?.[1]);
  const listingCandidate = isLikelyListingUrl(originalUrl) || !title ? readIkeaCandidateFromListing(html, originalUrl) : null;
  const canonicalUrl = stripTrackingParamsFromUrl(listingCandidate?.canonicalUrl ?? toAbsoluteUrl(readLinkTag(html, "canonical"), originalUrl));

  return {
    title: title ?? listingCandidate?.title ?? null,
    rawTitle: title ?? listingCandidate?.rawTitle ?? null,
    sku: sku ?? listingCandidate?.sku ?? null,
    canonicalUrl: canonicalUrl ?? listingCandidate?.canonicalUrl ?? null,
    identitySignals: ["site:ikea", ...(title ? ["title"] : []), ...(sku ? ["sku"] : []), ...(listingCandidate ? ["listing-resolve"] : [])],
    extractionSignals: ["site-parser", ...(title ? ["title"] : []), ...(sku ? ["sku"] : []), ...(canonicalUrl ? ["canonical"] : [])]
  };
}

function detectFlipkartMetadata(html: string, originalUrl: string): ProductIdentityCandidate {
  const hostname = extractHostname(originalUrl);
  const title =
    sanitizeTitleCandidate(cleanText(html.match(/<span[^>]*class=["'][^"']*VU-ZEz[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]), hostname) ??
    sanitizeTitleCandidate(readHeadingText(html), hostname);
  const sku =
    cleanText(new URL(originalUrl).searchParams.get("pid")) ??
    cleanText(html.match(/[?&]pid=([A-Z0-9]+)/i)?.[1]);
  const brand =
    sanitizeBrandCandidate(cleanText(html.match(/\bBrand\b[\s\S]{0,100}?<[^>]+>([\s\S]*?)<\/[^>]+>/i)?.[1])) ??
    sanitizeBrandCandidate(cleanText(html.match(/"brand"\s*:\s*"([^"]+)"/i)?.[1]));
  const listingCandidate = isLikelyListingUrl(originalUrl) || !title ? readFlipkartCandidateFromListing(html, originalUrl) : null;
  const canonicalUrl = stripTrackingParamsFromUrl(listingCandidate?.canonicalUrl ?? toAbsoluteUrl(readLinkTag(html, "canonical"), originalUrl));

  return {
    title: title ?? listingCandidate?.title ?? null,
    rawTitle: title ?? listingCandidate?.rawTitle ?? null,
    brand: brand ?? null,
    sku: sku ?? listingCandidate?.sku ?? null,
    canonicalUrl: canonicalUrl ?? listingCandidate?.canonicalUrl ?? null,
    identitySignals: ["site:flipkart", ...(title ? ["title"] : []), ...(brand ? ["brand"] : []), ...(sku ? ["sku"] : []), ...(listingCandidate ? ["listing-resolve"] : [])],
    extractionSignals: ["site-parser", ...(title ? ["title"] : []), ...(sku ? ["sku"] : []), ...(canonicalUrl ? ["canonical"] : [])]
  };
}

function detectSiteSpecificMetadata(html: string, originalUrl: string): ProductIdentityCandidate {
  const hostname = extractHostname(originalUrl);

  if (hostname.includes("amazon.")) {
    return detectAmazonMetadata(html, originalUrl);
  }

  if (hostname.includes("walmart.")) {
    return detectWalmartMetadata(html, originalUrl);
  }

  if (hostname.includes("ikea.")) {
    return detectIkeaMetadata(html, originalUrl);
  }

  if (hostname.includes("flipkart.")) {
    return detectFlipkartMetadata(html, originalUrl);
  }

  return {};
}

function selectBestValue<T>(candidates: Array<T | null | undefined>) {
  return candidates.find((candidate) => candidate !== null && candidate !== undefined) ?? null;
}

function computeIdentityConfidence(args: {
  title: string | null;
  brand: string | null;
  sku: string | null;
  canonicalUrl: string | null;
  identitySignals: string[];
  isListingResolved: boolean;
}) {
  let confidence = 0.18;

  if (args.title) {
    confidence += 0.36;
  }

  if (args.brand) {
    confidence += 0.14;
  }

  if (args.sku) {
    confidence += 0.22;
  }

  if (args.canonicalUrl) {
    confidence += 0.12;
  }

  if (args.isListingResolved) {
    confidence -= 0.06;
  }

  confidence += Math.min(0.12, args.identitySignals.length * 0.02);

  return Number(clamp(confidence, 0.12, 0.98).toFixed(2));
}

export function normalizeProductTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeBrand(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s&-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSku(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

export function parseProductMetadataFromHtml(html: string, originalUrl: string): ParsedProductMetadata {
  const url = new URL(originalUrl);
  const hostname = url.hostname.toLowerCase();
  const jsonLd = readJsonLdProductData(html);
  const siteSpecific = detectSiteSpecificMetadata(html, originalUrl);
  const extractionSignals = new Set<string>();
  const identitySignals = new Set<string>(siteSpecific.identitySignals ?? []);
  const rawTitle = selectBestValue([
    siteSpecific.rawTitle,
    jsonLd?.rawTitle,
    readMetaTag(html, "property", "og:title"),
    readMetaTag(html, "itemprop", "name"),
    readHeadingText(html),
    readTitleTag(html)
  ]);
  const title = selectBestValue([
    sanitizeTitleCandidate(siteSpecific.title, hostname),
    sanitizeTitleCandidate(jsonLd?.title, hostname),
    sanitizeTitleCandidate(readMetaTag(html, "property", "og:title"), hostname),
    sanitizeTitleCandidate(readMetaTag(html, "itemprop", "name"), hostname),
    sanitizeTitleCandidate(readHeadingText(html), hostname),
    sanitizeTitleCandidate(readTitleTag(html), hostname)
  ]);
  const description = selectBestValue([
    stripUrlNoise(siteSpecific.description, hostname),
    stripUrlNoise(jsonLd?.description, hostname),
    stripUrlNoise(readMetaTag(html, "property", "og:description"), hostname),
    stripUrlNoise(readMetaTag(html, "name", "description"), hostname)
  ]);
  const image = selectBestValue([
    siteSpecific.image,
    jsonLd?.image,
    readMetaTag(html, "property", "og:image"),
    readMetaTag(html, "name", "twitter:image"),
    readMetaTag(html, "itemprop", "image")
  ]);
  const resolvedImage = toAbsoluteUrl(image, originalUrl);
  const brand = selectBestValue([
    sanitizeBrandCandidate(siteSpecific.brand),
    sanitizeBrandCandidate(readMetaTag(html, "property", "product:brand")),
    sanitizeBrandCandidate(readMetaTag(html, "name", "brand")),
    sanitizeBrandCandidate(jsonLd?.brand),
    sanitizeBrandCandidate(cleanText(html.match(/\bBrand\b[\s\S]{0,120}?<[^>]+>([\s\S]*?)<\/[^>]+>/i)?.[1]))
  ]);
  const sku = selectBestValue([
    siteSpecific.sku,
    jsonLd?.sku,
    detectSkuFromHtml(html),
    hostname.includes("amazon.") ? extractAmazonAsin(originalUrl) : null
  ]);
  const canonicalLink = toAbsoluteUrl(readLinkTag(html, "canonical"), originalUrl);
  const canonicalUrl = stripTrackingParamsFromUrl(
    selectBestValue([
      siteSpecific.canonicalUrl,
      canonicalLink,
      sku && hostname.includes("amazon.") ? `${url.origin}/dp/${normalizeSku(sku)}` : null
    ])
  );
  const price = jsonLd?.price ?? detectPriceFromHtml(html) ?? null;
  const currency = jsonLd?.currency ?? detectCurrencyFromHtml(html) ?? null;
  const ratingValue = jsonLd?.ratingValue ?? detectRatingFromHtml(html);
  const reviewCount = jsonLd?.reviewCount ?? detectReviewCountFromHtml(html);
  const normalizedTitle = title ? normalizeProductTitle(title) : null;
  const normalizedBrand = brand ? normalizeBrand(brand) : null;

  if (title) {
    extractionSignals.add("title");
    identitySignals.add("title");
  }

  if (description) {
    extractionSignals.add("description");
  }

  if (resolvedImage) {
    extractionSignals.add("image");
  }

  if (brand) {
    extractionSignals.add("brand");
    identitySignals.add("brand");
  }

  if (sku) {
    extractionSignals.add("sku");
    identitySignals.add("sku");
  }

  if (canonicalUrl) {
    extractionSignals.add("canonical");
    identitySignals.add("canonical");
  }

  if (price) {
    extractionSignals.add("price");
  }

  if (ratingValue !== null) {
    extractionSignals.add("rating");
  }

  if (reviewCount !== null) {
    extractionSignals.add("review-count");
  }

  const isListingResolved = (siteSpecific.identitySignals ?? []).includes("listing-resolve");
  const identityConfidence = computeIdentityConfidence({
    title,
    brand,
    sku: sku ? normalizeSku(sku) : null,
    canonicalUrl,
    identitySignals: [...identitySignals],
    isListingResolved
  });

  if (!title && !description && !resolvedImage && !price && !brand && !sku && ratingValue === null) {
    throw new Error("No product metadata could be extracted from the page.");
  }

  console.log("[parser] product identity", {
    url: originalUrl,
    canonicalUrl,
    rawTitle,
    normalizedTitle,
    brand,
    sku: sku ? normalizeSku(sku) : null,
    identityConfidence
  });

  return {
    title,
    rawTitle,
    normalizedTitle,
    description,
    image: resolvedImage,
    price,
    brand,
    sku,
    canonicalUrl,
    identityConfidence,
    ratingValue,
    reviewCount,
    metadata: {
      sourceSite: hostname,
      currency,
      fetchedAt: new Date().toISOString(),
      extractionSignals: [...extractionSignals],
      identitySignals: [...identitySignals],
      rawTitle,
      description,
      image: resolvedImage,
      price,
      brand,
      sku: sku ? normalizeSku(sku) : null,
      canonicalUrl,
      normalizedBrand,
      identityConfidence,
      ratingValue,
      reviewCount
    }
  };
}
