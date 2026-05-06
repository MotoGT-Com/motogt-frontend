import {
  createLoader,
  createSerializer,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs";
import { href } from "react-router";

/**
 * Shared shop listing URL state (nuqs). Kept in `lib/` so components like
 * `SortingOptions` can update the same params as routes without circular imports.
 */
export const shopSearchParamsSchema = {
  sortBy: parseAsStringEnum([
    "name",
    "price",
    "createdAt",
    "stockQuantity",
    "carCompatibility",
  ]),
  sortOrder: parseAsStringEnum(["asc", "desc"]),
  categories: parseAsArrayOf(parseAsString).withDefault([]),
  search: parseAsString,
  productIds: parseAsArrayOf(parseAsString).withDefault([]),
  brand: parseAsString,
  carId: parseAsString,
  carBrand: parseAsString,
  carModel: parseAsString,
  carYear: parseAsInteger,
  productType: parseAsStringEnum(["car_parts", "riding_gear"]),
};

export const loadShopSearchParams = createLoader(shopSearchParamsSchema);

/** Build `/shop?…` links with typed query params. */
export const serializeShopURL = createSerializer(shopSearchParamsSchema).bind(
  null,
  href("/shop")
);
