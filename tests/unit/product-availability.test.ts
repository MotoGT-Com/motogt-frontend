import { describe, expect, it } from "vitest";
import {
  COMING_SOON_STOCK_QUANTITY,
  getProductAvailability,
  isComingSoonStock,
  isPurchasableStock,
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
});
