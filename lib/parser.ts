type ParsedProductMetadata = {
  title: string | null;
  normalizedTitle: string | null;
  description: string | null;
  image: string | null;
  price: string | null;
  brand: string | null;
  metadata: {
    sourceSite: string;
    currency: string | null;
    fetchedAt: string;
    extractionSignals: string[];
    rawTitle: string | null;
    description: string | null;
    image: string | null;
    price: string | null;
    brand: string | null;
  };
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = decodeHtml(value).replace(/\s+/g, " ").trim();
  return cleaned || null;
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readMetaTag(html: string, attribute: "property" | "name" | "itemprop", key: string) {
  const escapedKey = escapeRegExp(key);
  const patterns = [
    new RegExp(
      `<meta[^>]*${attribute}=["']${escapedKey}["'][^>]*content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${escapedKey}["'][^>]*>`,
      "i"
    )
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

function readJsonLdObjects(html: string) {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  return matches.flatMap((match) => {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown;
      if (Array.isArray(parsed)) {
        return parsed;
      }

      return [parsed];
    } catch {
      return [];
    }
  });
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

function readJsonLdProductData(html: string) {
  const objects = readJsonLdObjects(html);

  for (const item of objects) {
    const record = asRecord(item);

    if (!record) {
      continue;
    }

    const typeValue = record["@type"];
    const typeLabel =
      typeof typeValue === "string"
        ? typeValue
        : Array.isArray(typeValue)
          ? typeValue.find((entry) => typeof entry === "string")
          : null;

    if (typeof typeLabel !== "string" || !typeLabel.toLowerCase().includes("product")) {
      continue;
    }

    const offers = asRecord(record.offers);
    const aggregateOffer =
      Array.isArray(record.offers) && record.offers.length > 0 ? asRecord(record.offers[0]) : null;
    const offerRecord = offers ?? aggregateOffer;

    return {
      title: readStringValue(record, "name"),
      description: readStringValue(record, "description"),
      brand: readStringValue(record, "brand"),
      image:
        typeof record.image === "string"
          ? cleanText(record.image)
          : Array.isArray(record.image) && typeof record.image[0] === "string"
            ? cleanText(record.image[0])
            : null,
      price: offerRecord ? readStringValue(offerRecord, "price") : null,
      currency: offerRecord ? readStringValue(offerRecord, "priceCurrency") : null
    };
  }

  return null;
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
    /(?:\$|£|€)\s?([\d,.]+)/i
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
  return (
    readMetaTag(html, "property", "product:price:currency") ??
    readMetaTag(html, "property", "og:price:currency") ??
    readMetaTag(html, "itemprop", "priceCurrency") ??
    cleanText(html.match(/"priceCurrency"\s*:\s*"([A-Z]{3})"/i)?.[1])
  );
}

export function normalizeProductTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseProductMetadataFromHtml(html: string, originalUrl: string): ParsedProductMetadata {
  const url = new URL(originalUrl);
  const jsonLd = readJsonLdProductData(html);
  const extractionSignals: string[] = [];

  const title =
    readMetaTag(html, "property", "og:title") ??
    jsonLd?.title ??
    readMetaTag(html, "itemprop", "name") ??
    readTitleTag(html);
  if (title) {
    extractionSignals.push("title");
  }

  const description =
    readMetaTag(html, "name", "description") ??
    readMetaTag(html, "property", "og:description") ??
    jsonLd?.description ??
    null;
  if (description) {
    extractionSignals.push("description");
  }

  const image =
    readMetaTag(html, "property", "og:image") ??
    readMetaTag(html, "name", "twitter:image") ??
    readMetaTag(html, "itemprop", "image") ??
    jsonLd?.image ??
    null;
  const resolvedImage = toAbsoluteUrl(image, originalUrl);
  if (resolvedImage) {
    extractionSignals.push("image");
  }

  const brand =
    readMetaTag(html, "property", "product:brand") ??
    readMetaTag(html, "name", "brand") ??
    jsonLd?.brand ??
    null;
  if (brand) {
    extractionSignals.push("brand");
  }

  const price = jsonLd?.price ?? detectPriceFromHtml(html) ?? null;
  if (price) {
    extractionSignals.push("price");
  }

  const currency = jsonLd?.currency ?? detectCurrencyFromHtml(html) ?? null;
  const normalizedTitle = title ? normalizeProductTitle(title) : null;

  if (!title && !description && !resolvedImage && !price && !brand) {
    throw new Error("No product metadata could be extracted from the page.");
  }

  return {
    title,
    normalizedTitle,
    description,
    image: resolvedImage,
    price,
    brand,
    metadata: {
      sourceSite: url.hostname,
      currency,
      fetchedAt: new Date().toISOString(),
      extractionSignals,
      rawTitle: title,
      description,
      image: resolvedImage,
      price,
      brand
    }
  };
}
