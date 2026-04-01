import i18n from './i18n';
import { config } from '../config';

// Language ID mapping for backend API
export const LANGUAGE_IDS = config.languageIds as const;

// Get current language ID based on i18n language (must stay in sync with UI locale)
export const getCurrentLanguageId = (): string => {
  const raw = (i18n.language || "en").split("-")[0]?.toLowerCase() ?? "en";
  return raw === "ar" ? LANGUAGE_IDS.ar : LANGUAGE_IDS.en;
};

export let ALLOWED_COUNTRIES = [
  "JO" as const,
  "AE" as const,
  "SA" as const,
  "QA" as const,
];
export let DEFAULT_COUNTRY = "JO" as const;

export const CANCEL_REASONS = [
  "changedMind",
  "foundBetterPrice",
  "orderedByMistake",
  "takingTooLong",
  "productNotNeededAnymore",
] as const;

// Currency support
export const SUPPORTED_CURRENCIES = [
  "JOD",
  "AED",
  "SAR",
  "QAR",
  "USD",
] as const;

export type Currency = typeof SUPPORTED_CURRENCIES[number];

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  JOD: "د.ا",
  AED: "د.إ",
  SAR: "﷼",
  QAR: "ر.ق",
  USD: "$",
};

export const COUNTRY_TO_CURRENCY: Record<typeof ALLOWED_COUNTRIES[number], Currency> = {
  JO: "JOD",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
};

export const CURRENCY_TO_FLAG: Record<Currency, string> = {
  JOD: "🇯🇴", // Jordan
  AED: "🇦🇪", // UAE
  SAR: "🇸🇦", // Saudi Arabia
  QAR: "🇶🇦", // Qatar
  USD: "🇺🇸", // United States
};

export const faqItems = [
  {
    question: "What can I find on MotoGT?",
    answer:
      "MotoGT is your one stop shop for aftermarket car parts and accessories. From performance upgrades and lighting kits to interior add ons, wheels, tires, and vehicle protection. we've got thousands of products for a wide range of makes and models. Whether you're customizing, maintaining, or upgrading, you'll find the right part with the right fit.",
  },
  {
    question: "How do I know if a part fits my vehicle?",
    answer:
      "Simply use our vehicle selector (year, make, model) before you shop. You can also save cars to your Garage, we'll only show you parts that fit.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "You can pay using credit or debit card, CliQ, or cash on delivery. Depending on what's available in your area. All payments are securely processed and encrypted for your protection.",
  },
  {
    question: "What's the shipping time & cost?",
    answer:
      "Shipping within Jordan is currently free. We also offer international shipping, cost and estimated delivery time are shown at checkout.",
  },
  {
    question: "Do you ship internationally?",
    answer:
      "Yes, we currently ship to UAE, Saudi Arabia, Jordan, and Qatar, with more regions coming soon. International shipping rates and delivery times are shown at checkout.",
  },
];
