import type { ResultsViewModel } from "@/types";

type CacheEntry = {
  key: string;
  result: ResultsViewModel;
  createdAt: string;
};

const CACHE_TTL_MS = 1000 * 60 * 30;
const resultCache = new Map<string, CacheEntry>();

export function getCacheKey(url: string) {
  const parsed = new URL(url.trim());
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();

  if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return parsed.toString();
}

function isFresh(entry: CacheEntry) {
  return Date.now() - new Date(entry.createdAt).getTime() < CACHE_TTL_MS;
}

export function getCachedResult(url: string) {
  try {
    const key = getCacheKey(url);
    const entry = resultCache.get(key);

    if (!entry) {
      return null;
    }

    if (!isFresh(entry)) {
      resultCache.delete(key);
      return null;
    }

    return entry.result;
  } catch {
    return null;
  }
}

export function setCachedResult(url: string, result: ResultsViewModel) {
  const key = getCacheKey(url);
  resultCache.set(key, {
    key,
    result,
    createdAt: new Date().toISOString()
  });
}

export function hasCachedResult(url: string) {
  return getCachedResult(url) !== null;
}

