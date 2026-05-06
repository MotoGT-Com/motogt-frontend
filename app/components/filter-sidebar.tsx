import { Suspense, useMemo } from "react";
import { Await } from "react-router";
import { useQueryStates } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { SimpleCard } from "~/components/ui/card";
import CategoriesFilter from "~/components/filter";
import SortingOptions from "~/components/sorting-options";
import { AccordionDropdownButton } from "~/components/accordion-dropdown-button";
import { ShopFilterChipButton } from "~/components/shop-filter-chip-button";
import {
  InlineAccordion,
  InlineAccordionContent,
  InlineAccordionItem,
  InlineAccordionTrigger,
} from "~/components/ui/inline-accordion";
import { cn } from "~/lib/utils";
import { useTranslation } from "react-i18next";
import {
  subcategoryCountsQueryOptions,
  type SubcategoryCountFilters,
} from "~/lib/queries";
import { shopSearchParamsSchema } from "~/lib/shop-search-params";
import { MOTORCYCLE_FILTER_BRANDS } from "~/lib/motorcycle-brand";

type FilterSidebarProps = {
  categoriesResponse: any;
  productsResponse?: any;
  productTypeSlug?: string;
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

function MotorcycleBrandFilter() {
  const [searchParams, setSearchParams] = useQueryStates(
    shopSearchParamsSchema
  );
  const { t } = useTranslation("shop");

  const selectedBrand = searchParams.brand ?? "";
  const isAnySelected = !selectedBrand;

  return (
    <div>
      <InlineAccordion type="single" collapsible defaultValue="brand">
        <InlineAccordionItem value="brand">
          <InlineAccordionTrigger className="flex items-center justify-between w-full hover:no-underline p-0 mb-3 group">
            <h3 className="text-base font-bold text-black leading-[1.5] tracking-[-0.176px]">
              {t("filters.brand")}
            </h3>
            <AccordionDropdownButton />
          </InlineAccordionTrigger>
          <InlineAccordionContent>
            <div className="flex flex-col gap-2 pt-0">
              <div className="flex gap-2 flex-wrap">
                <ShopFilterChipButton
                  selected={isAnySelected}
                  onClick={() => void setSearchParams({ brand: null })}
                >
                  {t("sort.any")}
                </ShopFilterChipButton>
                <ShopFilterChipButton
                  selected={selectedBrand === MOTORCYCLE_FILTER_BRANDS[0].value}
                  onClick={() =>
                    void setSearchParams({
                      brand: MOTORCYCLE_FILTER_BRANDS[0].value,
                    })
                  }
                  className="px-3"
                >
                  {MOTORCYCLE_FILTER_BRANDS[0].label}
                </ShopFilterChipButton>
              </div>
              <div className="flex gap-2 flex-wrap">
                <ShopFilterChipButton
                  selected={selectedBrand === MOTORCYCLE_FILTER_BRANDS[1].value}
                  onClick={() =>
                    void setSearchParams({
                      brand: MOTORCYCLE_FILTER_BRANDS[1].value,
                    })
                  }
                  className="px-3"
                >
                  {MOTORCYCLE_FILTER_BRANDS[1].label}
                </ShopFilterChipButton>
              </div>
            </div>
          </InlineAccordionContent>
        </InlineAccordionItem>
      </InlineAccordion>
      <div className="border-t my-6" />
    </div>
  );
}

function FilterSidebar({
  categoriesResponse,
  productsResponse,
  productTypeSlug,
  countQueryBase,
  variant = "sidebar",
  className,
}: FilterSidebarProps) {
  const content = (
    <div className="max-h-[calc(100vh-9rem)] overflow-y-auto pr-1">
      <SortingOptions />
      <div className="border-t my-6" />
      {productTypeSlug === "motorcycles" && <MotorcycleBrandFilter />}
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
