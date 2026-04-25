import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { currencyFromGeoCountry } from "~/lib/constants";
import {
  GEOLOCATION_STORAGE_KEY,
  parseGeolocationStored,
  readValidGeolocationCache,
  writeGeolocationCache,
  fetchCountryCodeFromIp,
} from "~/lib/geolocation";

describe("currencyFromGeoCountry", () => {
  it("maps storefront GEO countries", () => {
    expect(currencyFromGeoCountry("JO")).toBe("JOD");
    expect(currencyFromGeoCountry("AE")).toBe("AED");
    expect(currencyFromGeoCountry("SA")).toBe("SAR");
    expect(currencyFromGeoCountry("QA")).toBe("QAR");
    expect(currencyFromGeoCountry("US")).toBe("USD");
  });

  it("is case-insensitive", () => {
    expect(currencyFromGeoCountry("ae")).toBe("AED");
  });

  it("defaults unknown or empty to JOD", () => {
    expect(currencyFromGeoCountry("DE")).toBe("JOD");
    expect(currencyFromGeoCountry("")).toBe("JOD");
    expect(currencyFromGeoCountry(null)).toBe("JOD");
    expect(currencyFromGeoCountry(undefined)).toBe("JOD");
  });
});

describe("parseGeolocationStored", () => {
  it("parses valid JSON", () => {
    const raw = JSON.stringify({
      countryCode: "SA",
      currency: "SAR",
      detectedAt: 1,
      expiresAt: 2,
    });
    expect(parseGeolocationStored(raw)).toEqual({
      countryCode: "SA",
      currency: "SAR",
      detectedAt: 1,
      expiresAt: 2,
    });
  });

  it("returns null for invalid payloads", () => {
    expect(parseGeolocationStored(null)).toBe(null);
    expect(parseGeolocationStored("")).toBe(null);
    expect(parseGeolocationStored("{")).toBe(null);
    expect(parseGeolocationStored("{}")).toBe(null);
    expect(
      parseGeolocationStored(JSON.stringify({ countryCode: "X" }))
    ).toBe(null);
  });
});

describe("geolocation localStorage cache", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("readValidGeolocationCache returns null when missing or expired", () => {
    expect(readValidGeolocationCache()).toBe(null);

    const now = Date.now();
    localStorage.setItem(
      GEOLOCATION_STORAGE_KEY,
      JSON.stringify({
        countryCode: "AE",
        currency: "AED",
        detectedAt: now - 10_000,
        expiresAt: now - 1,
      })
    );
    expect(readValidGeolocationCache()).toBe(null);
  });

  it("writeGeolocationCache then readValidGeolocationCache round-trip", () => {
    writeGeolocationCache("qa");
    const entry = readValidGeolocationCache();
    expect(entry?.countryCode).toBe("QA");
    expect(entry?.currency).toBe("QAR");
    expect(entry!.expiresAt).toBeGreaterThan(Date.now());
  });

  it("supports legacy detected_country cache key", () => {
    localStorage.setItem("detected_country", "AE");
    const entry = readValidGeolocationCache();
    expect(entry?.countryCode).toBe("AE");
    expect(entry?.currency).toBe("AED");
  });
});

describe("fetchCountryCodeFromIp", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns country_code from JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ country_code: "US" }),
      })
    );
    const c = new AbortController();
    await expect(fetchCountryCodeFromIp(c.signal)).resolves.toBe("US");
  });

  it("returns null on error flag or missing code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: true }),
      })
    );
    const c = new AbortController();
    await expect(fetchCountryCodeFromIp(c.signal)).resolves.toBe(null);
  });
});
