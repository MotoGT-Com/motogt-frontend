import { describe, expect, it } from "vitest";
import {
  buildProductPath,
  buildProductSlugSegment,
  extractProductIdFromSlugSegment,
  slugifyEnglishTitle,
} from "~/lib/product-url";

describe("product URL utilities", () => {
  it("slugifies English product titles", () => {
    expect(slugifyEnglishTitle("MotoWolf Jacket!! 2025")).toBe(
      "motowolf-jacket-2025"
    );
  });

  it("builds canonical path with english-slug-id pattern", () => {
    const path = buildProductPath({
      id: "1025",
      translations: [{ languageCode: "en", name: "MotoWolf Jacket" }],
    });

    expect(path).toBe("/shop/product/motowolf-jacket-1025");
  });

  it("prefers slug_en when english name is not present in current payload", () => {
    const path = buildProductPath({
      id: "e328b9f1-a857-486f-b4be-a3fa34f522af",
      slug_en: "motowolf-fast-lock-phone-holder",
      translations: [{ languageCode: "ar", name: "حامل هاتف" }],
    });

    expect(path).toBe(
      "/shop/product/motowolf-fast-lock-phone-holder-e328b9f1-a857-486f-b4be-a3fa34f522af"
    );
  });

  it("falls back to product-{id} when english title is missing", () => {
    const slugSegment = buildProductSlugSegment({
      id: "1025",
      translations: [{ languageCode: "ar", name: "جاكيت" }],
    });

    expect(slugSegment).toBe("product-1025");
  });

  it("extracts numeric id from end of slug segment", () => {
    expect(
      extractProductIdFromSlugSegment("motowolf-jacket-1025")
    ).toBe("1025");
  });

  it("extracts uuid id from end of slug segment", () => {
    const id = "19bf2cb6-1b50-4b95-80d6-9da6560588fc";
    expect(
      extractProductIdFromSlugSegment(`moto-jacket-${id}`)
    ).toBe(id);
  });
});
