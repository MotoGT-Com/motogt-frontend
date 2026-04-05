/**
 * Product image URLs from the API should prefer WebP/AVIF at the origin.
 * When `VITE_PRODUCT_IMAGE_FORMAT` is set (e.g. `webp`), a format query is appended
 * for CDNs/APIs that honor it; otherwise the URL is unchanged.
 */
export function productImageWithFormatPreference(url: string | undefined | null): string {
  if (!url?.trim()) return "";
  const u = url.trim();
  const lower = u.toLowerCase();
  if (lower.endsWith(".webp") || lower.endsWith(".avif")) return u;

  const fmt =
    typeof import.meta.env.VITE_PRODUCT_IMAGE_FORMAT === "string"
      ? import.meta.env.VITE_PRODUCT_IMAGE_FORMAT.trim()
      : "";
  if (!fmt) return u;

  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}format=${encodeURIComponent(fmt)}`;
}

/** Width hints for responsive srcset (single origin URL; browser picks one candidate). */
const PDP_SRC_WIDTHS = [640, 960, 1280] as const;

export function buildProductDetailSrcSet(optimizedUrl: string): string {
  if (!optimizedUrl) return "";
  return PDP_SRC_WIDTHS.map((w) => `${optimizedUrl} ${w}w`).join(", ");
}

export const PRODUCT_DETAIL_IMAGE_SIZES =
  "(max-width: 1024px) 100vw, min(1280px, 52vw)";
