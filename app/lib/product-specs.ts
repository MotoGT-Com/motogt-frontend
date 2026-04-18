import type { ProductSpecs, ProductSpecsByKey } from "~/lib/client";

const isNonEmptyBlock = (
  block: ProductSpecsByKey | undefined
): block is ProductSpecsByKey =>
  !!block && typeof block === "object" && Object.keys(block).length > 0;

/**
 * Public product responses scope `specs` to the requested `languageId`.
 * Keys are language codes (`en`, `ar`), not a single merged map.
 */
export function resolveProductSpecsByLanguage(
  specs: ProductSpecs | undefined,
  language: string
): ProductSpecsByKey {
  if (!specs) return {};

  const lang = language.split("-")[0]?.toLowerCase() || "en";
  if (isNonEmptyBlock(specs[lang])) {
    return specs[lang];
  }
  if (isNonEmptyBlock(specs.en)) {
    return specs.en;
  }
  const firstKey = Object.keys(specs).find((k) => isNonEmptyBlock(specs[k]));
  return firstKey ? specs[firstKey]! : {};
}
