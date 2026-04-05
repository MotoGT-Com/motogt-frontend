type ProductTranslationSource = {
  languageCode?: string | null;
  name?: string | null;
  slug?: string | null;
};

type ProductUrlSource = {
  id?: string | number | null;
  slug?: string | null;
  slug_en?: string | null;
  slug_ar?: string | null;
  translations?: ProductTranslationSource[] | null;
};

const UUID_V4_OR_V5_AT_END =
  /-([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const NUMERIC_ID_AT_END = /-(\d+)$/;
const ALNUM_WITH_DIGIT_AT_END = /-((?=[a-z0-9]*\d)[a-z0-9]+)$/i;

export function slugifyEnglishTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeAsciiSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toAsciiSlug(slug: unknown): string | undefined {
  if (typeof slug !== "string" || !slug.trim()) return undefined;
  const normalized = normalizeAsciiSlug(slug);
  if (!normalized) return undefined;
  return /^[a-z0-9-]+$/.test(normalized) ? normalized : undefined;
}

function getEnglishProductName(product: ProductUrlSource): string | undefined {
  const translations = product.translations ?? [];
  const englishTranslation = translations.find(
    (translation) =>
      translation.languageCode?.toLowerCase().startsWith("en") &&
      translation.name?.trim()
  );

  return englishTranslation?.name?.trim() || undefined;
}

function getEnglishProductSlug(product: ProductUrlSource): string | undefined {
  const directEnglishSlug = toAsciiSlug(product.slug_en);
  if (directEnglishSlug) return directEnglishSlug;

  const englishTranslationSlug = toAsciiSlug(
    (product.translations ?? []).find((translation) =>
      translation.languageCode?.toLowerCase().startsWith("en")
    )?.slug
  );
  if (englishTranslationSlug) return englishTranslationSlug;

  return toAsciiSlug(product.slug);
}

export function buildProductSlugSegment(product: ProductUrlSource): string {
  const id = String(product.id ?? "").trim();
  if (!id) return "";

  const englishSlug = getEnglishProductSlug(product);
  if (englishSlug) {
    return `${englishSlug}-${id}`;
  }

  const englishName = getEnglishProductName(product);
  const slugFromEnglishName = englishName ? slugifyEnglishTitle(englishName) : "";
  const finalSlug = slugFromEnglishName || "product";

  return `${finalSlug}-${id}`;
}

export function buildProductPath(product: ProductUrlSource): string {
  const segment = buildProductSlugSegment(product);
  if (!segment) return "/shop";
  return `/product/${segment}`;
}

export function extractProductIdFromSlugSegment(
  slugSegment: string | undefined | null
): string | undefined {
  if (!slugSegment) return undefined;
  const decoded = decodeURIComponent(slugSegment).trim();
  if (!decoded) return undefined;

  return (
    decoded.match(NUMERIC_ID_AT_END)?.[1] ||
    decoded.match(UUID_V4_OR_V5_AT_END)?.[1] ||
    decoded.match(ALNUM_WITH_DIGIT_AT_END)?.[1] ||
    undefined
  );
}
