import { describe, it, expect } from "vitest";
import { productsByTypeInfiniteQueryOptions } from "~/lib/queries";

describe("productsByTypeInfiniteQueryOptions", () => {
  it("builds stable queryKey and sets staleTime", () => {
    const options = productsByTypeInfiniteQueryOptions({
      productTypeId: "product-type-id",
      params: { search: "test", categories: ["b", "a"] },
    });

    expect(options.queryKey).toEqual([
      "products",
      "product-type-id",
      "test",
      "",
      "",
      null,
      null,
      null,
      "a,b",
      "",
    ]);
    expect(options.staleTime).toBeGreaterThan(0);
  });

  it("computes next page correctly", () => {
    const options = productsByTypeInfiniteQueryOptions({
      productTypeId: "product-type-id",
      params: {},
    });

    const next = options.getNextPageParam?.(
      { meta: { hasNext: true } } as any,
      [{ meta: { hasNext: true } }] as any
    );

    expect(next).toBe(2);
  });
});
