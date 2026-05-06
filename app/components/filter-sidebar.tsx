import { Suspense, useMemo } from "react";
import { Await } from "react-router";
import { useQueryStates } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { SimpleCard } from "~/components/ui/card";
import CategoriesFilter from "~/components/filter";
import SortingOptions from "~/components/sorting-options";
import { cn } from "~/lib/utils";
import {
  subcategoryCountsQueryOptions,
  type SubcategoryCountFilters,
} from "~/lib/queries";
import { shopSearchParamsSchema } from "~/lib/shop-search-params";

type FilterSidebarProps = {
  categoriesResponse: any;
  productsResponse?: any;
  countQueryBase: Pick<
    SubcategoryCountFilters,
    "storeId" | "languageId" | "productTypeId"
  >;
  variant?: "sidebar" | "drawer";
  className?: string;
};

function collectSubcategoryIds(categories: any[]): string[] {
  const ids: string[] = [];
  for (const cat of categories ?? []) {
    const subs = (cat?.subcategories ?? []) as Array<{ id?: string }>;
    for (const sub of subs) {
      if (sub?.id) ids.push(sub.id);
    }
  }
  return Array.from(new Set(ids));
}

function buildClientCountsById(products: any[] = []) {
  const counts: Record<string, number> = {};
  products.forEach((product) => {
    if (product?.categoryId) {
      counts[product.categoryId] = (counts[product.categoryId] || 0) + 1;
    }
    if (product?.subCategoryId) {
      counts[product.subCategoryId] =
        (counts[product.subCategoryId] || 0) + 1;
    }
  });
  return counts;
}

/** Client-side counts from `data` are only correct when the response includes every matching product (first page is complete). */
function areClientCountsReliable(products: any, productList: any[]): boolean {
  if (products?.error) return false;
  const meta = products?.data?.meta;
  if (!meta) return false;
  if (meta.hasNext === true) return false;
  if (meta.hasNext === false) return true;
  if (typeof meta.total === "number") {
    return meta.total <= productList.length;
  }
  return false;
}

function CategoriesFilterContainer({
  categories,
  productList,
  productsResponse,
  countQueryBase,
}: {
  categories: any[];
  productList: any[];
  productsResponse: any;
  countQueryBase: FilterSidebarProps["countQueryBase"];
}) {
  const [searchParams] = useQueryStates(shopSearchParamsSchema);

  const subcategoryIds = useMemo(
    () => collectSubcategoryIds(categories),
    [categories]
  );

  const filters = useMemo<SubcategoryCountFilters | null>(() => {
    if (!countQueryBase?.storeId || !countQueryBase?.languageId) return null;
    const productIds =
      searchParams.productIds && searchParams.productIds.length > 0
        ? searchParams.productIds.join(",")
        : undefined;
    return {
      storeId: countQueryBase.storeId,
      languageId: countQueryBase.languageId,
      productTypeId: countQueryBase.productTypeId,
      carBrand: searchParams.carBrand ?? undefined,
      carModel: searchParams.carModel ?? undefined,
      carYear:
        typeof searchParams.carYear === "number"
          ? searchParams.carYear
          : undefined,
      carId: searchParams.carId ?? undefined,
      search: searchParams.search ?? undefined,
      productIds,
    };
  }, [
    searchParams.carBrand,
    searchParams.carModel,
    searchParams.carYear,
    searchParams.carId,
    searchParams.search,
    searchParams.productIds,
    countQueryBase,
  ]);

  const hasActiveFilters = Boolean(
    filters?.carBrand ||
      filters?.carModel ||
      filters?.carYear ||
      filters?.carId ||
      filters?.search ||
      filters?.productIds ||
      (searchParams.categories && searchParams.categories.length > 0)
  );

  const hasFiltersAffectingCounts = Boolean(
    filters?.carBrand ||
      filters?.carModel ||
      filters?.carYear ||
      filters?.carId ||
      filters?.search ||
      filters?.productIds
  );

  const { data: serverCountsById } = useQuery({
    ...subcategoryCountsQueryOptions({
      filters: filters ?? {
        storeId: "",
        languageId: "",
      },
      subcategoryIds,
      enabled:
        !!filters && hasFiltersAffectingCounts && subcategoryIds.length > 0,
    }),
  });

  const clientCountsReliable = areClientCountsReliable(
    productsResponse,
    productList
  );

  const countsById = useMemo<Record<string, number> | undefined>(() => {
    if (serverCountsById) return serverCountsById;
    if (!hasFiltersAffectingCounts) return undefined;
    if (clientCountsReliable) return buildClientCountsById(productList);
    return undefined;
  }, [
    serverCountsById,
    hasFiltersAffectingCounts,
    clientCountsReliable,
    productList,
  ]);

  return (
    <CategoriesFilter
      categories={categories}
      countsById={countsById}
      hasActiveFilters={hasActiveFilters}
      countsLockedToFilters={hasFiltersAffectingCounts}
    />
  );
}

function FilterSidebar({
  categoriesResponse,
  productsResponse,
  countQueryBase,
  variant = "sidebar",
  className,
}: FilterSidebarProps) {
  const content = (
    <div className="max-h-[calc(100vh-9rem)] overflow-y-auto pr-1">
      <SortingOptions />
      <div className="border-t my-6" />
      <Suspense fallback={<div>Loading categories...</div>}>
        <Await resolve={Promise.all([categoriesResponse, productsResponse])}>
          {([categories, products]) => (
            <CategoriesFilterContainer
              categories={categories?.data?.data || []}
              productList={products?.data?.data || []}
              productsResponse={products}
              countQueryBase={countQueryBase}
            />
          )}
        </Await>
      </Suspense>
    </div>
  );

  if (variant === "drawer") {
    return <div className={cn("w-full", className)}>{content}</div>;
  }

  return (
    <SimpleCard
      className={cn("p-4 sticky top-4 w-[280px] shrink-0", className)}
    >
      {content}
    </SimpleCard>
  );
}

export default FilterSidebar;
