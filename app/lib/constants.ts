import i18n from './i18n';
import { config } from '../config';

// Language ID mapping for backend API
export const LANGUAGE_IDS = {
  ar: config.languageIds.ar,
  en: config.languageIds.en,
} as const;

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
  "US" as const,
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
  US: "USD",
};

export const ADDRESS_CITIES: Record<(typeof ALLOWED_COUNTRIES)[number], string[]> = {
  AE: [
    "Dubai",
    "Abu Dhabi",
    "Sharjah",
    "Ajman",
    "Ras Al Khaimah",
    "Fujairah",
    "Umm Al Quwain",
    "Al Ain",
    "Dibba Al Fujairah",
    "Dibba Al Hisn",
    "Kalba",
    "Khor Fakkan",
    "Madinat Zayed",
    "Ruwais",
    "Ghayathi",
    "Liwa",
    "Hatta",
    "Dhaid",
  ],
  SA: ["Riyadh", "Jeddah", "Dammam", "Khobar"],
  JO: [
    "Amman",
    "Zarqa",
    "Irbid",
    "Salt",
    "Madaba",
    "Jerash",
    "Ajloun",
    "Ruseifa",
    "Fuheis",
    "Mahis",
  ],
  QA: [
    "Doha",
    "Al Wakrah",
    "Al Khor",
    "Al Rayyan",
    "Umm Salal",
    "Al Daayen",
    "Al Shamal",
    "Al Shahaniya",
    "Mesaieed",
    "Lusail",
    "Dukhan",
    "Ras Laffan",
    "Al Gharrafa",
    "Al Thumama",
    "Al Wukair",
    "Abu Hamour",
    "Al Mamoura",
    "Madinat Khalifa",
    "Al Hilal",
    "Ain Khaled",
  ],
  US: [
    "New York",
    "Los Angeles",
    "Chicago",
    "Houston",
    "Phoenix",
    "Philadelphia",
    "San Antonio",
    "San Diego",
    "Dallas",
    "San Jose",
    "Austin",
    "Jacksonville",
    "San Francisco",
    "Seattle",
    "Denver",
    "Washington",
    "Boston",
    "Miami",
    "Atlanta",
    "Las Vegas",
    "Portland",
    "Detroit",
    "Nashville",
    "Charlotte",
    "Minneapolis",
    "Tampa",
    "Orlando",
    "Cleveland",
    "Indianapolis",
    "Columbus",
  ],
};

/** ISO 3166-1 alpha-2 → storefront currency for IP geolocation (only these map; all others → JOD). */
export const GEO_COUNTRY_TO_CURRENCY: Record<string, Currency> = {
  JO: "JOD",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  US: "USD",
};

export function currencyFromGeoCountry(
  countryCode: string | null | undefined
): Currency {
  if (!countryCode) return "JOD";
  const upper = countryCode.trim().toUpperCase();
  return GEO_COUNTRY_TO_CURRENCY[upper] ?? "JOD";
}

export const CAR_CARE_PRODUCT_TYPE_SLUG = "car-care" as const;
export const LEGACY_CAR_CARE_PRODUCT_TYPE_SLUG = "car-care-accessiores" as const;
export const CAR_PARTS_PRODUCT_TYPE_SLUG = "car-parts" as const;
export const SPARE_PARTS_PATH = "/spare-parts" as const;
/** Top-level "Spare Parts" category under car parts (API slug: spare-parts). */
export const SPARE_PARTS_CATEGORY_ID =
  "58f413fe-4af6-428b-9774-12941bc80a88" as const;

export function isCarCareProductType(pt: {
  slug?: string | null;
  code?: string | null;
}): boolean {
  const slug = pt.slug?.toLowerCase();
  const code = pt.code?.toLowerCase().replace(/-/g, "_");
  return (
    slug === CAR_CARE_PRODUCT_TYPE_SLUG ||
    slug === LEGACY_CAR_CARE_PRODUCT_TYPE_SLUG ||
    code === "car_care" ||
    code === "car_care_accessiores" ||
    code === "car_care_accessories"
  );
}

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
      "Yes, we currently ship to UAE, Saudi Arabia, Jordan, Qatar, and the United States, with more regions coming soon. International shipping rates and delivery times are shown at checkout.",
  },
];
