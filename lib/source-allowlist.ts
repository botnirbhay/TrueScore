import type { SourceSearchConfig } from "@/types/entities";

function buildSearchUrl(domain: string, query: string) {
  const encodedQuery = encodeURIComponent(`site:${domain} ${query}`);
  return `https://duckduckgo.com/html/?q=${encodedQuery}`;
}

export const SOURCE_ALLOWLIST: SourceSearchConfig[] = [
  {
    key: "reddit-reviews",
    label: "Reddit Reviews",
    domain: "reddit.com",
    kind: "review",
    searchUrl: (query) => buildSearchUrl("reddit.com", `${query} review`),
    allowedPathPrefixes: ["/r/"]
  },
  {
    key: "bestbuy-offers",
    label: "Best Buy Offers",
    domain: "bestbuy.com",
    kind: "offer",
    searchUrl: (query) => buildSearchUrl("bestbuy.com", `${query} price`)
  },
  {
    key: "walmart-offers",
    label: "Walmart Offers",
    domain: "walmart.com",
    kind: "offer",
    searchUrl: (query) => buildSearchUrl("walmart.com", `${query} price`)
  }
];

export function getAllowlistedSources() {
  return SOURCE_ALLOWLIST;
}

export function findAllowlistedSourceByDomain(hostname: string) {
  return SOURCE_ALLOWLIST.find((source) => hostname === source.domain || hostname.endsWith(`.${source.domain}`)) ?? null;
}

