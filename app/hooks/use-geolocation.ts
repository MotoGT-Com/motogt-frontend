import { useCurrency } from "~/hooks/use-currency";

/**
 * Geo-aware currency view over {@link useCurrency}.
 * Use {@link useCurrency}'s `convertPrice` / `batchConvert` for amounts (async, backend rates).
 */
export function useGeolocation() {
  const ctx = useCurrency();
  return {
    currency: ctx.selectedCurrency,
    countryCode: ctx.detectedCountryCode,
    detectedCurrency: ctx.detectedCurrency,
    isManualOverride: ctx.isManualOverride,
    isGeoResolved: ctx.isGeoResolved,
    geoFetchFailed: ctx.geoFetchFailed,
    convertPrice: ctx.convertPrice,
    batchConvert: ctx.batchConvert,
    setSelectedCurrency: ctx.setSelectedCurrency,
    selectedCurrency: ctx.selectedCurrency,
    cacheAge: ctx.cacheAge,
    isUsingCachedRates: ctx.isUsingCachedRates,
  };
}
