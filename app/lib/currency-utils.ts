import { getApiExchangeRates, postApiExchangeRatesConvert } from "./client";
import type { Currency } from "./constants";

export interface ConversionCacheEntry {
  rate: number;
  timestamp: number;
}

export interface CachedRates {
  [key: string]: ConversionCacheEntry; // key format: "FROM-TO"
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get cache key for exchange rate pair
 */
export function getCacheKey(from: Currency, to: Currency): string {
  return `${from}-${to}`;
}

/**
 * Check if cache entry is still valid
 */
export function isCacheValid(entry: ConversionCacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * Get cache age in hours
 */
export function getCacheAgeHours(entry: ConversionCacheEntry): number {
  const ageMs = Date.now() - entry.timestamp;
  return Math.floor(ageMs / (60 * 60 * 1000));
}

/**
 * Load cached rates from localStorage
 */
export function loadCachedRates(): CachedRates {
  if (typeof window === "undefined") return {};
  
  try {
    const stored = localStorage.getItem("motogt-exchange-rates");
    if (!stored) return {};
    return JSON.parse(stored);
  } catch (error) {
    return {};
  }
}

/**
 * Save rates to localStorage
 */
export function saveCachedRates(rates: CachedRates): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem("motogt-exchange-rates", JSON.stringify(rates));
  } catch (error) {
  }
}

/**
 * Get cached rate or fetch from API
 */
export async function getExchangeRate(
  from: Currency,
  to: Currency,
  useCache = true
): Promise<{ rate: number; fromCache: boolean; cacheAge?: number }> {
  // Same currency = rate of 1
  if (from === to) {
    return { rate: 1, fromCache: false };
  }

  const cacheKey = getCacheKey(from, to);
  
  // Try cache first if enabled
  if (useCache) {
    const cached = loadCachedRates();
    const entry = cached[cacheKey];
    
    if (entry) {
      const cacheAge = getCacheAgeHours(entry);
      // Use cache even if stale (as per requirements)
      return { rate: entry.rate, fromCache: true, cacheAge };
    }
  }

  // Fetch from API
  try {
    const response = await getApiExchangeRates({
      query: { from, to },
    });

    if (response.error || !response.data?.data?.rate) {
      throw new Error("Failed to fetch exchange rate");
    }

    const rate = response.data.data.rate;

    // Save to cache
    const cached = loadCachedRates();
    cached[cacheKey] = {
      rate,
      timestamp: Date.now(),
    };
    saveCachedRates(cached);

    return { rate, fromCache: false };
  } catch (error) {
    
    // Try stale cache as fallback
    const cached = loadCachedRates();
    const entry = cached[cacheKey];
    if (entry) {
      const cacheAge = getCacheAgeHours(entry);
      return { rate: entry.rate, fromCache: true, cacheAge };
    }
    
    // Development fallback: use mock rates if API unavailable
    if (import.meta.env.DEV) {
      const mockRates: Record<string, number> = {
        "JOD-AED": 5.16,
        "JOD-SAR": 5.28,
        "JOD-QAR": 5.13,
        "JOD-USD": 1.41,
        "AED-JOD": 0.19,
        "AED-SAR": 1.02,
        "AED-QAR": 0.99,
        "AED-USD": 0.27,
        "SAR-JOD": 0.19,
        "SAR-AED": 0.98,
        "SAR-QAR": 0.97,
        "SAR-USD": 0.27,
        "QAR-JOD": 0.19,
        "QAR-AED": 1.01,
        "QAR-SAR": 1.03,
        "QAR-USD": 0.27,
        "USD-JOD": 0.71,
        "USD-AED": 3.67,
        "USD-SAR": 3.75,
        "USD-QAR": 3.64,
      };
      
      const mockRate = mockRates[cacheKey];
      if (mockRate) {
        return { rate: mockRate, fromCache: false };
      }
    }
    
    throw error;
  }
}

/**
 * Batch convert multiple prices using a single exchange rate
 * More efficient than individual conversions
 */
export async function batchConvertPrices(
  amounts: number[],
  from: Currency,
  to: Currency
): Promise<{ convertedAmounts: number[]; rate: number; fromCache: boolean; cacheAge?: number }> {
  const { rate, fromCache, cacheAge } = await getExchangeRate(from, to);
  
  const convertedAmounts = amounts.map(amount => 
    parseFloat((amount * rate).toFixed(2))
  );

  return { convertedAmounts, rate, fromCache, cacheAge };
}

/**
 * Convert a single amount
 */
export async function convertAmount(
  amount: number,
  from: Currency,
  to: Currency
): Promise<{ convertedAmount: number; rate: number; fromCache: boolean; cacheAge?: number }> {
  const { rate, fromCache, cacheAge } = await getExchangeRate(from, to);
  const convertedAmount = parseFloat((amount * rate).toFixed(2));
  
  return { convertedAmount, rate, fromCache, cacheAge };
}

/**
 * Pre-fetch common exchange rates for faster conversions
 * Call this on app initialization
 */
export async function prefetchCommonRates(baseCurrency: Currency = "JOD"): Promise<void> {
  const targetCurrencies: Currency[] = ["AED", "SAR", "QAR", "USD"];
  
  const promises = targetCurrencies
    .filter(currency => currency !== baseCurrency)
    .map(currency => getExchangeRate(baseCurrency, currency).catch(() => null));

  await Promise.all(promises);
}
