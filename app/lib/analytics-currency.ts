import type { Currency } from "~/lib/constants";

type CurrencyAnalyticsSource = "geo" | "manual" | "default" | "geo_fail";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Pushes a GTM-friendly custom event. In GTM, add a trigger on Custom Event
 * name `currency_context` and map fields to GA4 event parameters as needed.
 */
export function trackCurrencyContext(params: {
  currency: Currency;
  country_code: string | null;
  source: CurrencyAnalyticsSource;
  geo_fail?: boolean;
}): void {
  if (typeof window === "undefined") return;
  const layer = window.dataLayer ?? (window.dataLayer = []);
  layer.push({
    event: "currency_context",
    currency: params.currency,
    country_code: params.country_code ?? "",
    source: params.source,
    geo_fail: params.geo_fail ?? false,
  });
}
