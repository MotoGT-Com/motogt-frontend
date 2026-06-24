/** Sentinel stock quantity set in admin to mark a product as coming soon. */
export const COMING_SOON_STOCK_QUANTITY = 1_000_000;

/** Disabled Coming Soon CTA styling (storefront buttons). */
export const comingSoonButtonClassName =
  "bg-[#FF9C61] text-white hover:bg-[#FF9C61] disabled:bg-[#FF9C61] disabled:text-white disabled:opacity-100 cursor-not-allowed";

export type ProductAvailability = "in_stock" | "out_of_stock" | "coming_soon";

export type ProductWithStock = {
  stockQuantity: number;
  variants?: Array<{
    isActive: boolean;
    stockQuantity: number;
  }> | null;
};

function getActiveVariants(product: ProductWithStock) {
  return product.variants?.filter((variant) => variant.isActive) ?? [];
}

/** Total purchasable units across active variants, or parent stock when there are none. */
export function getEffectiveProductStockQuantity(product: ProductWithStock): number {
  const activeVariants = getActiveVariants(product);
  if (activeVariants.length > 0) {
    return activeVariants.reduce((total, variant) => total + variant.stockQuantity, 0);
  }
  return product.stockQuantity;
}

export function getProductAvailabilityFromProduct(
  product: ProductWithStock
): ProductAvailability {
  const activeVariants = getActiveVariants(product);
  if (activeVariants.length > 0) {
    if (activeVariants.some((variant) => isPurchasableStock(variant.stockQuantity))) {
      return "in_stock";
    }
    if (activeVariants.every((variant) => isComingSoonStock(variant.stockQuantity))) {
      return "coming_soon";
    }
    return "out_of_stock";
  }
  return getProductAvailability(product.stockQuantity);
}

export function isProductPurchasable(product: ProductWithStock): boolean {
  return getProductAvailabilityFromProduct(product) === "in_stock";
}

export function productHasVariants(product: ProductWithStock): boolean {
  return getActiveVariants(product).length > 0;
}

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

/** Lower values sort earlier: in stock → out of stock → coming soon. */
export function getAvailabilitySortRank(stockQuantity: number): number {
  switch (getProductAvailability(stockQuantity)) {
    case "in_stock":
      return 0;
    case "out_of_stock":
      return 1;
    case "coming_soon":
      return 2;
  }
}

export function compareProductsByAvailability(
  a: ProductWithStock,
  b: ProductWithStock
): number {
  return (
    getAvailabilitySortRank(getEffectiveProductStockQuantity(a)) -
    getAvailabilitySortRank(getEffectiveProductStockQuantity(b))
  );
}

export function sortProductsByAvailability<T extends ProductWithStock>(
  products: T[]
): T[] {
  return [...products].sort(compareProductsByAvailability);
}
