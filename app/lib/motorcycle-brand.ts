import getLocalizedTranslation from "~/lib/get-locale-translation";
import type { ProductItem } from "~/lib/client/types.gen";

const BRAND_SPEC_KEYS = new Set([
  "brand",
  "brandname",
  "brand_name",
  "manufacturer",
  "make",
  "vendor",
  "vendorname",
]);

const normalizeKey = (value: string) =>
  value.toLowerCase().replace(/[\s_-]/g, "");

const cleanBrand = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const getBrandFromSpecs = (product: ProductItem, lang: string) => {
  const specs = product.specs;
  if (!specs) return null;

  const order = [lang, "en", "ar"];
  for (const code of order) {
    const byLang = specs[code];
    if (!byLang) continue;
    for (const [key, entry] of Object.entries(byLang)) {
      if (!BRAND_SPEC_KEYS.has(normalizeKey(key))) continue;
      const value = cleanBrand(entry?.value);
      if (value) return value;
    }
  }

  return null;
};

const getBrandFromTags = (product: ProductItem, lang: string) => {
  const translation =
    product.translations.find((t) => (t.languageCode || "").split("-")[0] === lang) ||
    product.translations.find((t) => (t.languageCode || "").split("-")[0] === "en") ||
    product.translations[0];
  const tags = translation?.tags ?? [];
  for (const rawTag of tags) {
    const tag = cleanBrand(rawTag);
    if (!tag) continue;
    const match = /^brand\s*:\s*(.+)$/i.exec(tag);
    return cleanBrand(match ? match[1] : tag);
  }
  return null;
};

const getBrandFromName = (product: ProductItem) => {
  const name = cleanBrand(getLocalizedTranslation(product.translations)?.name);
  if (!name) return null;
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  // Keep two words for cases like "O'NEAL Element".
  if (words[0].includes("'") && words[1]) {
    return `${words[0]} ${words[1]}`;
  }

  return words[0];
};

export function getMotorcycleBrand(product: ProductItem, language: string): string | null {
  const lang = (language || "").split("-")[0] || "en";
  return (
    getBrandFromSpecs(product, lang) ||
    getBrandFromTags(product, lang) ||
    getBrandFromName(product)
  );
}

/** Sidebar filter options — keep in sync with `MotorcycleBrandFilter` URL values. */
export const MOTORCYCLE_FILTER_BRANDS = [
  { value: "Motowolf", label: "Motowolf" },
  { value: "O'neal", label: "O'neal" },
] as const;

const normalizeForCompare = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function motorcycleBrandFilterMatches(
  selectedFilterValue: string,
  productBrand: string | null
): boolean {
  if (!productBrand?.trim()) return false;
  const a = normalizeForCompare(selectedFilterValue);
  const b = normalizeForCompare(productBrand);
  if (!a || !b) return false;
  if (a === normalizeForCompare(MOTORCYCLE_FILTER_BRANDS[1].value)) {
    return b.includes("oneal");
  }
  if (a === normalizeForCompare(MOTORCYCLE_FILTER_BRANDS[0].value)) {
    return b.includes("motowolf");
  }
  return a === b;
}
