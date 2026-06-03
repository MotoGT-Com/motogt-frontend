/** Sentinel stock quantity set in admin to mark a product as coming soon. */
export const COMING_SOON_STOCK_QUANTITY = 1_000_000;

/** Disabled Coming Soon CTA styling (storefront buttons). */
export const comingSoonButtonClassName =
  "bg-[#FF9C61] text-white hover:bg-[#FF9C61] disabled:bg-[#FF9C61] disabled:text-white disabled:opacity-100 cursor-not-allowed";

export type ProductAvailability = "in_stock" | "out_of_stock" | "coming_soon";

export function isComingSoonStock(stockQuantity: number): boolean {
  return stockQuantity === COMING_SOON_STOCK_QUANTITY;
}

export function getProductAvailability(
  stockQuantity: number
): ProductAvailability {
  if (isComingSoonStock(stockQuantity)) return "coming_soon";
  if (stockQuantity > 0) return "in_stock";
  return "out_of_stock";
}

export function isPurchasableStock(stockQuantity: number): boolean {
  return getProductAvailability(stockQuantity) === "in_stock";
}
