import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import {
  type Currency,
  COUNTRY_TO_CURRENCY,
  DEFAULT_COUNTRY,
  currencyFromGeoCountry,
} from "~/lib/constants";
import {
  batchConvertPrices,
  convertAmount,
  prefetchCommonRates,
  getCacheAgeHours,
  loadCachedRates,
} from "~/lib/currency-utils";
import {
  readValidGeolocationCache,
  detectGeolocation,
} from "~/lib/geolocation";
import { trackCurrencyContext } from "~/lib/analytics-currency";

const STORAGE_KEY = "motogt-selected-currency";
const MANUAL_OVERRIDE_KEY = "motogt-currency-manual-override";

interface CurrencyContextValue {
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  convertPrice: (
    amount: number,
    fromCurrency: Currency
  ) => Promise<{
    convertedAmount: number;
    rate: number;
    fromCache: boolean;
    cacheAge?: number;
  }>;
  batchConvert: (
    amounts: number[],
    fromCurrency: Currency
  ) => Promise<{
    convertedAmounts: number[];
    rate: number;
    fromCache: boolean;
    cacheAge?: number;
  }>;
  isManualOverride: boolean;
  cacheAge: number | null;
  isUsingCachedRates: boolean;
  /** ISO country from last successful IP geo (null if unknown / manual-only). */
  detectedCountryCode: string | null;
  /** Currency implied by detected country (null until geo path has not run; manual-only → null). */
  detectedCurrency: Currency | null;
  /** False only while auto geo fetch is in flight (no valid cache on first paint). */
  isGeoResolved: boolean;
  /** True when auto detection failed and we fell back to JOD. */
  geoFetchFailed: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(
  undefined
);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrencyState] = useState<Currency>(
    COUNTRY_TO_CURRENCY[DEFAULT_COUNTRY]
  );

  const [isManualOverride, setIsManualOverride] = useState(false);

  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [isUsingCachedRates, setIsUsingCachedRates] = useState(false);

  const [detectedCountryCode, setDetectedCountryCode] = useState<
    string | null
  >(null);
  const [detectedCurrency, setDetectedCurrency] = useState<Currency | null>(
    null
  );
  const [isGeoResolved, setIsGeoResolved] = useState(false);
  const [geoFetchFailed, setGeoFetchFailed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    prefetchCommonRates("JOD").catch(() => {});

    const cachedRates = loadCachedRates();
    const entries = Object.values(cachedRates);
    if (entries.length > 0) {
      const maxAge = Math.max(...entries.map((entry) => getCacheAgeHours(entry)));
      setCacheAge(maxAge);
      setIsUsingCachedRates(true);
    }

    const manual = localStorage.getItem(MANUAL_OVERRIDE_KEY) === "true";
    if (manual) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedCurrencyState(stored as Currency);
      }
      setIsManualOverride(true);
      setIsGeoResolved(true);
      setDetectedCountryCode(null);
      setDetectedCurrency(null);
      setGeoFetchFailed(false);
      return;
    }

    setIsManualOverride(false);

    const validGeo = readValidGeolocationCache();
    if (validGeo) {
      const c = currencyFromGeoCountry(validGeo.countryCode);
      setSelectedCurrencyState(c);
      setDetectedCountryCode(validGeo.countryCode);
      setDetectedCurrency(c);
      setIsGeoResolved(true);
      setGeoFetchFailed(false);
      trackCurrencyContext({
        currency: c,
        country_code: validGeo.countryCode,
        source: "geo",
      });
      return;
    }

    setIsGeoResolved(false);
    setDetectedCountryCode(null);
    setDetectedCurrency(null);
    setGeoFetchFailed(false);

    void (async () => {
      if (localStorage.getItem(MANUAL_OVERRIDE_KEY) === "true") return;

      const result = await detectGeolocation();

      if (localStorage.getItem(MANUAL_OVERRIDE_KEY) === "true") return;

      if (result.ok) {
        setSelectedCurrencyState(result.currency);
        setDetectedCountryCode(result.countryCode);
        setDetectedCurrency(result.currency);
        setGeoFetchFailed(false);
        trackCurrencyContext({
          currency: result.currency,
          country_code: result.countryCode,
          source: "geo",
        });
      } else {
        setSelectedCurrencyState("JOD");
        setDetectedCountryCode(null);
        setDetectedCurrency("JOD");
        setGeoFetchFailed(true);
        trackCurrencyContext({
          currency: "JOD",
          country_code: null,
          source: "geo_fail",
          geo_fail: true,
        });
      }
      setIsGeoResolved(true);
    })();
  }, []);

  const setSelectedCurrency = useCallback((currency: Currency) => {
    setSelectedCurrencyState(currency);
    setIsManualOverride(true);
    setDetectedCountryCode(null);
    setDetectedCurrency(currency);
    setIsGeoResolved(true);
    setGeoFetchFailed(false);

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, currency);
      localStorage.setItem(MANUAL_OVERRIDE_KEY, "true");
    }

    trackCurrencyContext({
      currency,
      country_code: null,
      source: "manual",
    });
  }, []);

  const convertPrice = useCallback(
    async (amount: number, fromCurrency: Currency) => {
      const result = await convertAmount(
        amount,
        fromCurrency,
        selectedCurrency
      );

      if (result.fromCache && result.cacheAge !== undefined) {
        setCacheAge(result.cacheAge);
        setIsUsingCachedRates(true);
      } else {
        setCacheAge(null);
        setIsUsingCachedRates(false);
      }

      return result;
    },
    [selectedCurrency]
  );

  const batchConvert = useCallback(
    async (amounts: number[], fromCurrency: Currency) => {
      const result = await batchConvertPrices(
        amounts,
        fromCurrency,
        selectedCurrency
      );

      if (result.fromCache && result.cacheAge !== undefined) {
        setCacheAge(result.cacheAge);
        setIsUsingCachedRates(true);
      } else {
        setCacheAge(null);
        setIsUsingCachedRates(false);
      }

      return result;
    },
    [selectedCurrency]
  );

  const value: CurrencyContextValue = {
    selectedCurrency,
    setSelectedCurrency,
    convertPrice,
    batchConvert,
    isManualOverride,
    cacheAge,
    isUsingCachedRates,
    detectedCountryCode,
    detectedCurrency,
    isGeoResolved,
    geoFetchFailed,
  };

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
