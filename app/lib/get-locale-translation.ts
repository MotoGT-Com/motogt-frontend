import i18n from "./i18n";

type TranslationLike = {
  languageCode?: string | null;
  slug?: string | null;
};

type ProductSlugSource = {
  slug?: string | null;
  slug_ar?: string | null;
  slug_en?: string | null;
  translations?: TranslationLike[] | null;
} | null | undefined;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isAsciiSlug = (value: unknown): value is string =>
  isNonEmptyString(value) && /^[a-z0-9-_]+$/i.test(value.trim());

/**
 * Get localized translation from translations array based on current language
 */
function getLocalizedTranslation<T extends { languageCode: string }>(translations: T[] | undefined): T | undefined {
  if (!translations || translations.length === 0) return undefined;
  
  const currentLang = (i18n.language || "").split("-")[0]; // 'en' or 'ar'
  
  // Find translation matching current language
  const translation = translations.find(t => t.languageCode === currentLang);
  
  // Fallback to Arabic if current language not found (since Arabic is now default)
  return translation || translations.find(t => t.languageCode === "ar") || translations[0];
}

export function resolveProductSlug(
  product: ProductSlugSource,
  options: { language?: string; preferEnglish?: boolean } = {}
): string | undefined {
  if (!product) return undefined;

  const preferEnglish = options.preferEnglish ?? true;
  const translations = product.translations ?? [];
  const currentLang = (options.language ?? i18n.language ?? "").split("-")[0];
  const byLang = (lang: string, predicate: (value: unknown) => value is string) =>
    translations.find(t => t.languageCode === lang && predicate(t.slug))?.slug;

  if (preferEnglish) {
    return (
      (isAsciiSlug(product.slug_en) ? product.slug_en : undefined) ||
      byLang("en", isAsciiSlug) ||
      (isAsciiSlug(product.slug) ? product.slug : undefined) ||
      byLang(currentLang, isAsciiSlug) ||
      byLang("ar", isAsciiSlug) ||
      translations.find(t => isAsciiSlug(t.slug))?.slug ||
      undefined
    );
  }

  const directSlug = [product.slug, product.slug_ar, product.slug_en].find(isNonEmptyString);
  if (directSlug) return directSlug;

  return (
    byLang(currentLang, isNonEmptyString) ||
    byLang("ar", isNonEmptyString) ||
    byLang("en", isNonEmptyString) ||
    translations.find(t => isNonEmptyString(t.slug))?.slug ||
    undefined
  );
}

export default getLocalizedTranslation;
