import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import {
  type Currency,
  COUNTRY_TO_CURRENCY,
  DEFAULT_COUNTRY,
} from "~/lib/constants";
import {
  getExchangeRate,
  batchConvertPrices,
  convertAmount,
  prefetchCommonRates,
  getCacheAgeHours,
  loadCachedRates,
} from "~/lib/currency-utils";

const STORAGE_KEY = "motogt-selected-currency";
const MANUAL_OVERRIDE_KEY = "motogt-currency-manual-override";

interface CurrencyContextValue {
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  convertPrice: (amount: number, fromCurrency: Currency) => Promise<{
    convertedAmount: number;
    rate: number;
    fromCache: boolean;
    cacheAge?: number;
  }>;
  batchConvert: (amounts: number[], fromCurrency: Currency) => Promise<{
    convertedAmounts: number[];
    rate: number;
    fromCache: boolean;
    cacheAge?: number;
  }>;
  isManualOverride: boolean;
  cacheAge: number | null;
  isUsingCachedRates: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Initialize with server-safe defaults to avoid hydration mismatch.
  // localStorage is read in useEffect after hydration.
  const [selectedCurrency, setSelectedCurrencyState] = useState<Currency>(COUNTRY_TO_CURRENCY[DEFAULT_COUNTRY]);

  const [isManualOverride, setIsManualOverride] = useState(false);

  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [isUsingCachedRates, setIsUsingCachedRates] = useState(false);

  // Sync currency selection from localStorage after hydration
  useEffect(() => {
    const manualOverride = localStorage.getItem(MANUAL_OVERRIDE_KEY);
    if (manualOverride === "true") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedCurrencyState(stored as Currency);
        setIsManualOverride(true);
      }
    }
  }, []);

  // Initialize and pre-fetch common rates
  useEffect(() => {
    // Pre-fetch common exchange rates in the background
    prefetchCommonRates("JOD").catch(() => {
      // Silent fail - will use API on demand
    });

    // Check cache status
    const cached = loadCachedRates();
    const entries = Object.values(cached);
    if (entries.length > 0) {
      const maxAge = Math.max(...entries.map(entry => getCacheAgeHours(entry)));
      setCacheAge(maxAge);
      setIsUsingCachedRates(true);
    }
  }, []);

  // Set selected currency with manual override flag
  const setSelectedCurrency = useCallback((currency: Currency) => {
    setSelectedCurrencyState(currency);
    setIsManualOverride(true);
    
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, currency);
      localStorage.setItem(MANUAL_OVERRIDE_KEY, "true");
    }
  }, []);

  // Convert single price
  const convertPrice = useCallback(async (amount: number, fromCurrency: Currency) => {
    const result = await convertAmount(amount, fromCurrency, selectedCurrency);
    
    if (result.fromCache && result.cacheAge !== undefined) {
      setCacheAge(result.cacheAge);
      setIsUsingCachedRates(true);
    } else {
      setCacheAge(null);
      setIsUsingCachedRates(false);
    }
    
    return result;
  }, [selectedCurrency]);

  // Batch convert multiple prices
  const batchConvert = useCallback(async (amounts: number[], fromCurrency: Currency) => {
    const result = await batchConvertPrices(amounts, fromCurrency, selectedCurrency);
    
    if (result.fromCache && result.cacheAge !== undefined) {
      setCacheAge(result.cacheAge);
      setIsUsingCachedRates(true);
    } else {
      setCacheAge(null);
      setIsUsingCachedRates(false);
    }
    
    return result;
  }, [selectedCurrency]);

  const value: CurrencyContextValue = {
    selectedCurrency,
    setSelectedCurrency,
    convertPrice,
    batchConvert,
    isManualOverride,
    cacheAge,
    isUsingCachedRates,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
