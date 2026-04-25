import type { Currency } from "~/lib/constants";
import { currencyFromGeoCountry } from "~/lib/constants";

export const GEOLOCATION_STORAGE_KEY = "motogt_geolocation";
export const LEGACY_DETECTED_COUNTRY_KEY = "detected_country";

/** 24 hours — reduces third-party API calls */
export const GEOLOCATION_TTL_MS = 24 * 60 * 60 * 1000;

export const GEO_FETCH_TIMEOUT_MS = 2000;

function createFetchAbortSignal(ms: number): {
  signal: AbortSignal;
  cancel: () => void;
} {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return { signal: AbortSignal.timeout(ms), cancel: () => {} };
  }
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), ms);
  return {
    signal: c.signal,
    cancel: () => clearTimeout(id),
  };
}

export interface MotogtGeolocationStored {
  countryCode: string;
  currency: Currency;
  detectedAt: number;
  expiresAt: number;
}

function isMotogtGeolocationStored(x: unknown): x is MotogtGeolocationStored {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.countryCode === "string" &&
    typeof o.currency === "string" &&
    typeof o.detectedAt === "number" &&
    typeof o.expiresAt === "number"
  );
}

export function parseGeolocationStored(raw: string | null): MotogtGeolocationStored | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isMotogtGeolocationStored(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function entryFromLegacyDetectedCountry(
  legacyCountry: string | null
): MotogtGeolocationStored | null {
  if (!legacyCountry) return null;
  const normalized = legacyCountry.trim().toUpperCase();
  if (!normalized) return null;
  const now = Date.now();
  return {
    countryCode: normalized,
    currency: currencyFromGeoCountry(normalized),
    detectedAt: now,
    expiresAt: now + GEOLOCATION_TTL_MS,
  };
}

/** Valid (unexpired) cache entry, or null. */
export function readValidGeolocationCache(): MotogtGeolocationStored | null {
  if (typeof window === "undefined") return null;
  try {
    const entry = parseGeolocationStored(localStorage.getItem(GEOLOCATION_STORAGE_KEY));
    if (entry && Date.now() <= entry.expiresAt) return entry;

    // Backward compatibility: announcement banner uses this key.
    const legacyEntry = entryFromLegacyDetectedCountry(
      localStorage.getItem(LEGACY_DETECTED_COUNTRY_KEY)
    );
    if (!legacyEntry) return null;
    // Promote legacy value into canonical cache shape.
    localStorage.setItem(GEOLOCATION_STORAGE_KEY, JSON.stringify(legacyEntry));
    return legacyEntry;
  } catch {
    return null;
  }
}

/** Last stored entry even if expired (for fallback after failed fetch). */
export function readStaleGeolocationCache(): MotogtGeolocationStored | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      parseGeolocationStored(localStorage.getItem(GEOLOCATION_STORAGE_KEY)) ??
      entryFromLegacyDetectedCountry(localStorage.getItem(LEGACY_DETECTED_COUNTRY_KEY))
    );
  } catch {
    return null;
  }
}

export function writeGeolocationCache(countryCode: string): void {
  if (typeof window === "undefined") return;
  const normalized = countryCode.trim().toUpperCase();
  const currency = currencyFromGeoCountry(normalized);
  const detectedAt = Date.now();
  const payload: MotogtGeolocationStored = {
    countryCode: normalized,
    currency,
    detectedAt,
    expiresAt: detectedAt + GEOLOCATION_TTL_MS,
  };
  try {
    localStorage.setItem(GEOLOCATION_STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(LEGACY_DETECTED_COUNTRY_KEY, normalized);
  } catch {
    // Quota or disabled — ignore
  }
}

type IpApiCoJson = { country_code?: string; error?: boolean; reason?: string };

/**
 * Fetches country from ipapi.co (browser CORS-friendly free tier).
 * Returns ISO country code or null on failure.
 */
export async function fetchCountryCodeFromIp(
  signal: AbortSignal
): Promise<string | null> {
  const res = await fetch("https://ipapi.co/json/", {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as IpApiCoJson;
  if (data.error || !data.country_code || typeof data.country_code !== "string") {
    return null;
  }
  return data.country_code.trim().toUpperCase() || null;
}

export type GeolocationDetectResult =
  | {
      ok: true;
      countryCode: string;
      currency: Currency;
      fromCache: boolean;
    }
  | {
      ok: false;
      countryCode: null;
      currency: Currency;
      fromCache: boolean;
    };

export type DetectGeolocationOptions = {
  /**
   * When true, always hit the IP API first so travelers / VPN / stale localStorage
   * do not keep the wrong currency for up to the cache TTL. On failure, falls back
   * to valid cache, then stale cache, then JOD (same as non-bypass).
   */
  bypassCache?: boolean;
};

/**
 * Detects country via IP with a hard timeout.
 * Default: uses valid cache first (fewer API calls).
 * bypassCache: always fetch IP first, then fall back if the request fails.
 */
export async function detectGeolocation(
  options?: DetectGeolocationOptions
): Promise<GeolocationDetectResult> {
  const bypassCache = options?.bypassCache === true;

  if (!bypassCache) {
    const valid = readValidGeolocationCache();
    if (valid) {
      return {
        ok: true,
        countryCode: valid.countryCode,
        currency: currencyFromGeoCountry(valid.countryCode),
        fromCache: true,
      };
    }
  }

  const { signal, cancel } = createFetchAbortSignal(GEO_FETCH_TIMEOUT_MS);

  try {
    const code = await fetchCountryCodeFromIp(signal);
    if (code) {
      writeGeolocationCache(code);
      return {
        ok: true,
        countryCode: code,
        currency: currencyFromGeoCountry(code),
        fromCache: false,
      };
    }
  } catch {
    // timeout / network / parse
  } finally {
    cancel();
  }

  if (bypassCache) {
    const stillValid = readValidGeolocationCache();
    if (stillValid) {
      return {
        ok: true,
        countryCode: stillValid.countryCode,
        currency: currencyFromGeoCountry(stillValid.countryCode),
        fromCache: true,
      };
    }
  }

  const stale = readStaleGeolocationCache();
  if (stale?.countryCode) {
    return {
      ok: true,
      countryCode: stale.countryCode,
      currency: currencyFromGeoCountry(stale.countryCode),
      fromCache: true,
    };
  }

  return {
    ok: false,
    countryCode: null,
    currency: "JOD",
    fromCache: false,
  };
}
