import type { SourceSearchConfig } from "@/types/entities";

export const SOURCE_ALLOWLIST: SourceSearchConfig[] = [
  {
    key: "reddit-reviews",
    label: "Reddit Reviews",
    domain: "reddit.com",
    kind: "review",
    aliases: ["www.reddit.com", "old.reddit.com"],
    allowedPathPrefixes: ["/r/"],
    blockedPathKeywords: ["/user/", "/login", "/media"]
  },
  {
    key: "amazon-offers",
    label: "Amazon Offers",
    domain: "amazon.com",
    kind: "offer",
    aliases: ["www.amazon.com", "smile.amazon.com"],
    allowedPathPrefixes: ["/dp/", "/gp/product/"],
    blockedPathKeywords: ["/s?", "/gp/help", "/ap/"]
  },
  {
    key: "bestbuy-offers",
    label: "Best Buy Offers",
    domain: "bestbuy.com",
    kind: "offer",
    aliases: ["www.bestbuy.com"],
    blockedPathKeywords: ["/site/searchpage.jsp", "/account", "/identity/"]
  },
  {
    key: "walmart-offers",
    label: "Walmart Offers",
    domain: "walmart.com",
    kind: "offer",
    aliases: ["www.walmart.com"],
    blockedPathKeywords: ["/search", "/account", "/my-items"]
  },
  {
    key: "target-offers",
    label: "Target Offers",
    domain: "target.com",
    kind: "offer",
    aliases: ["www.target.com"],
    allowedPathPrefixes: ["/p/"],
    blockedPathKeywords: ["/s?", "/search", "/c/"]
  },
  {
    key: "ikea-offers",
    label: "IKEA Offers",
    domain: "ikea.com",
    kind: "offer",
    aliases: ["www.ikea.com"],
    blockedPathKeywords: ["/search/", "/customer-service/"]
  },
  {
    key: "homedepot-offers",
    label: "Home Depot Offers",
    domain: "homedepot.com",
    kind: "offer",
    aliases: ["www.homedepot.com"],
    blockedPathKeywords: ["/s/", "/b/", "/auth/"]
  },
  {
    key: "lowes-offers",
    label: "Lowe's Offers",
    domain: "lowes.com",
    kind: "offer",
    aliases: ["www.lowes.com"],
    blockedPathKeywords: ["/search", "/n/", "/account/"]
  },
  {
    key: "wayfair-offers",
    label: "Wayfair Offers",
    domain: "wayfair.com",
    kind: "offer",
    aliases: ["www.wayfair.com"],
    blockedPathKeywords: ["/keyword.php", "/v/account/"]
  },
  {
    key: "newegg-offers",
    label: "Newegg Offers",
    domain: "newegg.com",
    kind: "offer",
    aliases: ["www.newegg.com"],
    blockedPathKeywords: ["/p/pl", "/account/"]
  },
  {
    key: "ebay-offers",
    label: "eBay Offers",
    domain: "ebay.com",
    kind: "offer",
    aliases: ["www.ebay.com"],
    allowedPathPrefixes: ["/itm/"],
    blockedPathKeywords: ["/sch/", "/usr/"]
  }
];

export function getAllowlistedSources() {
  return SOURCE_ALLOWLIST;
}

export function findAllowlistedSourceByDomain(hostname: string) {
  return (
    SOURCE_ALLOWLIST.find(
      (source) =>
        hostname === source.domain ||
        hostname.endsWith(`.${source.domain}`) ||
        source.aliases?.includes(hostname)
    ) ?? null
  );
}

