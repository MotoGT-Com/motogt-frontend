import type { Currency } from "~/lib/constants";

type CurrencyAnalyticsSource = "geo" | "manual" | "default" | "geo_fail";

declare global {
  interface Window {
    gtag?: (
      command: string,
      target: string | Date,
      config?: Record<string, string | number | boolean | undefined>
    ) => void;
    dataLayer?: unknown[];
  }
}

/**
 * GA4-friendly custom event when currency context is resolved or changed.
 */
export function trackCurrencyContext(params: {
  currency: Currency;
  country_code: string | null;
  source: CurrencyAnalyticsSource;
  geo_fail?: boolean;
}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  window.gtag("event", "currency_context", {
    currency: params.currency,
    country_code: params.country_code ?? "",
    source: params.source,
    geo_fail: params.geo_fail ?? false,
  });
}
