import { describe, expect, it } from "vitest";
import {
  COMING_SOON_STOCK_QUANTITY,
  getEffectiveProductStockQuantity,
  getProductAvailability,
  getProductAvailabilityFromProduct,
  isComingSoonStock,
  isProductPurchasable,
  isPurchasableStock,
  sortProductsByAvailability,
} from "~/lib/product-availability";

describe("product-availability", () => {
  it("treats sentinel quantity as coming soon", () => {
    expect(isComingSoonStock(COMING_SOON_STOCK_QUANTITY)).toBe(true);
    expect(getProductAvailability(COMING_SOON_STOCK_QUANTITY)).toBe("coming_soon");
    expect(isPurchasableStock(COMING_SOON_STOCK_QUANTITY)).toBe(false);
  });

  it("treats zero as out of stock", () => {
    expect(getProductAvailability(0)).toBe("out_of_stock");
    expect(isPurchasableStock(0)).toBe(false);
  });

  it("treats positive stock as in stock", () => {
    expect(getProductAvailability(5)).toBe("in_stock");
    expect(isPurchasableStock(5)).toBe(true);
  });

  it("does not treat large non-sentinel values as coming soon", () => {
    expect(getProductAvailability(999_999)).toBe("in_stock");
  });

  it("sorts in-stock and out-of-stock products before coming soon", () => {
    const products = [
      { id: "coming", stockQuantity: COMING_SOON_STOCK_QUANTITY },
      { id: "out", stockQuantity: 0 },
      { id: "in", stockQuantity: 4 },
    ];

    expect(sortProductsByAvailability(products).map((product) => product.id)).toEqual([
      "in",
      "out",
      "coming",
    ]);
  });

  it("uses variant stock when parent stock is zero", () => {
    const product = {
      stockQuantity: 0,
      variants: [
        { isActive: true, stockQuantity: 5 },
        { isActive: true, stockQuantity: 5 },
      ],
    };

    expect(getEffectiveProductStockQuantity(product)).toBe(10);
    expect(getProductAvailabilityFromProduct(product)).toBe("in_stock");
    expect(isProductPurchasable(product)).toBe(true);
  });

  it("ignores inactive variants for availability", () => {
    const product = {
      stockQuantity: 0,
      variants: [
        { isActive: false, stockQuantity: 5 },
        { isActive: true, stockQuantity: 0 },
      ],
    };

    expect(getProductAvailabilityFromProduct(product)).toBe("out_of_stock");
  });
});
