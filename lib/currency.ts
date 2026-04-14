const FX_RATE_API_URL = process.env.TRUE_SCORE_FX_API_URL ?? "https://api.frankfurter.dev/v2/rate";
const FX_CACHE_TTL_MS = 1000 * 60 * 60 * 6;

export const USD_FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  INR: 0.0118,
  EUR: 1.09,
  GBP: 1.27,
  JPY: 0.0067,
  AED: 0.2723
};

const CURRENCY_ALIASES: Record<string, string> = {
  US$: "USD",
  $: "USD",
  USD: "USD",
  US: "USD",
  "₹": "INR",
  INR: "INR",
  RS: "INR",
  "RS.": "INR",
  RUPEE: "INR",
  RUPEES: "INR",
  "€": "EUR",
  EUR: "EUR",
  "£": "GBP",
  GBP: "GBP",
  "¥": "JPY",
  JPY: "JPY",
  "円": "JPY",
  AED: "AED",
  "د.إ": "AED",
  "دإ": "AED",
  DH: "AED",
  DHS: "AED"
};

type CachedRate = {
  rate: number;
  fetchedAt: string;
  source: "live" | "fallback" | "identity" | "unknown";
  cachedAt: number;
};

type ResolvedUsdRate = {
  currency: string;
  rate: number | null;
  fetchedAt: string;
  source: "live" | "fallback" | "identity" | "unknown";
};

export type UsdConversionResult = {
  originalCurrency: string | null;
  convertedAmountUsd: number | null;
  exchangeRateUsed: number | null;
  conversionTimestamp: string | null;
  conversionSource: "live" | "fallback" | "identity" | "unknown";
};

const fxRateCache = new Map<string, CachedRate>();

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}

export function parseNumericAmount(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return normalized ? Number(normalized[0]) : null;
}

export function normalizeCurrencyCode(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/\s+/g, "").toUpperCase();
  if (CURRENCY_ALIASES[cleaned]) {
    return CURRENCY_ALIASES[cleaned];
  }

  const alphaCode = value.toUpperCase().match(/\b([A-Z]{3})\b/)?.[1] ?? null;
  if (alphaCode && CURRENCY_ALIASES[alphaCode]) {
    return CURRENCY_ALIASES[alphaCode];
  }

  return alphaCode;
}

export function detectCurrencyCode(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) {
      continue;
    }

    for (const [alias, code] of Object.entries(CURRENCY_ALIASES)) {
      if (value.toUpperCase().includes(alias)) {
        return code;
      }
    }

    const normalized = normalizeCurrencyCode(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function readCachedUsdRate(currency: string) {
  const cached = fxRateCache.get(currency);

  if (!cached) {
    return null;
  }

  if (Date.now() - cached.cachedAt > FX_CACHE_TTL_MS) {
    fxRateCache.delete(currency);
    return null;
  }

  return cached;
}

function resolveUsdRateFromFallback(currency: string): ResolvedUsdRate {
  const fetchedAt = new Date().toISOString();

  if (currency === "USD") {
    return {
      currency,
      rate: 1,
      fetchedAt,
      source: "identity"
    };
  }

  const fallbackRate = USD_FALLBACK_RATES[currency];
  if (typeof fallbackRate === "number") {
    return {
      currency,
      rate: fallbackRate,
      fetchedAt,
      source: "fallback"
    };
  }

  return {
    currency,
    rate: 1,
    fetchedAt,
    source: "unknown"
  };
}

export function getUsdRateSync(currencyInput: string | null | undefined): ResolvedUsdRate {
  const currency = normalizeCurrencyCode(currencyInput);

  if (!currency) {
    return {
      currency: "USD",
      rate: 1,
      fetchedAt: new Date().toISOString(),
      source: "unknown"
    };
  }

  const cached = readCachedUsdRate(currency);
  if (cached) {
    return {
      currency,
      rate: cached.rate,
      fetchedAt: cached.fetchedAt,
      source: cached.source
    };
  }

  return resolveUsdRateFromFallback(currency);
}

export async function getUsdRate(currencyInput: string | null | undefined): Promise<ResolvedUsdRate> {
  const currency = normalizeCurrencyCode(currencyInput);

  if (!currency) {
    return {
      currency: "USD",
      rate: 1,
      fetchedAt: new Date().toISOString(),
      source: "unknown"
    };
  }

  const cached = readCachedUsdRate(currency);
  if (cached) {
    return {
      currency,
      rate: cached.rate,
      fetchedAt: cached.fetchedAt,
      source: cached.source
    };
  }

  if (currency === "USD") {
    const identity = resolveUsdRateFromFallback(currency);
    fxRateCache.set(currency, {
      rate: identity.rate ?? 1,
      fetchedAt: identity.fetchedAt,
      source: identity.source,
      cachedAt: Date.now()
    });
    return identity;
  }

  try {
    const response = await fetch(`${FX_RATE_API_URL}/${currency}/USD`, {
      cache: "no-store",
      headers: {
        "user-agent": "TrueScoreBot/0.1 (+https://truescore.local)"
      }
    });

    if (response.ok) {
      const payload = (await response.json()) as { date?: string; rate?: number };

      if (typeof payload.rate === "number" && Number.isFinite(payload.rate) && payload.rate > 0) {
        const fetchedAt = payload.date ? new Date(`${payload.date}T00:00:00.000Z`).toISOString() : new Date().toISOString();

        fxRateCache.set(currency, {
          rate: payload.rate,
          fetchedAt,
          source: "live",
          cachedAt: Date.now()
        });

        return {
          currency,
          rate: payload.rate,
          fetchedAt,
          source: "live"
        };
      }
    }
  } catch {
    // Ignore network failures and fall back to deterministic constants.
  }

  const fallback = resolveUsdRateFromFallback(currency);
  if (fallback.rate !== null) {
    fxRateCache.set(currency, {
      rate: fallback.rate,
      fetchedAt: fallback.fetchedAt,
      source: fallback.source,
      cachedAt: Date.now()
    });
  }

  return fallback;
}

export function convertAmountToUsdSync(amount: number | null, currencyInput: string | null | undefined): UsdConversionResult {
  const resolved = getUsdRateSync(currencyInput);

  if (amount === null || resolved.rate === null) {
    return {
      originalCurrency: normalizeCurrencyCode(currencyInput),
      convertedAmountUsd: null,
      exchangeRateUsed: resolved.rate,
      conversionTimestamp: resolved.fetchedAt,
      conversionSource: resolved.source
    };
  }

  return {
    originalCurrency: resolved.currency,
    convertedAmountUsd: roundUsd(amount * resolved.rate),
    exchangeRateUsed: resolved.rate,
    conversionTimestamp: resolved.fetchedAt,
    conversionSource: resolved.source
  };
}

export async function convertAmountToUsd(amount: number | null, currencyInput: string | null | undefined): Promise<UsdConversionResult> {
  const resolved = await getUsdRate(currencyInput);

  if (amount === null || resolved.rate === null) {
    return {
      originalCurrency: normalizeCurrencyCode(currencyInput),
      convertedAmountUsd: null,
      exchangeRateUsed: resolved.rate,
      conversionTimestamp: resolved.fetchedAt,
      conversionSource: resolved.source
    };
  }

  return {
    originalCurrency: resolved.currency,
    convertedAmountUsd: roundUsd(amount * resolved.rate),
    exchangeRateUsed: resolved.rate,
    conversionTimestamp: resolved.fetchedAt,
    conversionSource: resolved.source
  };
}

