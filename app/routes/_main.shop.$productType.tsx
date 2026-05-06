import { PlusIcon, MinusIcon, FilterIcon, Loader2, X, ChevronUp, ChevronDown, } from "lucide-react";
import { AccordionDropdownButton } from "~/components/accordion-dropdown-button";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Await, Link, useSearchParams } from "react-router";
import { ProductCard, ProductCardSkeleton } from "~/components/product-card";
import { ProductSearch } from "~/components/product-search";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { slugToProductType, formatProductType, stripNulls, cn, } from "~/lib/utils";
import type { Route } from "./+types/_main.shop.$productType";
import { getApiProductsPublic, getApiCategoriesPublic, getApiProductTypes } from "~/lib/client";
import {
  productsByTypeInfiniteQueryOptions,
  subcategoryCountsQueryOptions,
} from "~/lib/queries";
import { defaultParams } from "~/lib/api-client";
import { InlineAccordion, InlineAccordionContent, InlineAccordionItem, InlineAccordionTrigger, } from "~/components/ui/inline-accordion";
import { dehydrate, HydrationBoundary, QueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { Drawer, DrawerContent, DrawerTrigger } from "~/components/ui/drawer";
import { Label } from "@radix-ui/react-label";
import { createLoader, createSerializer, useQueryStates } from "nuqs";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { shopSearchParamsSchema } from "~/lib/shop-search-params";
import { Badge } from "~/components/ui/badge";
import { useTranslation } from "react-i18next";
import { getLocaleFromRequest } from "~/lib/i18n-cookie";
import FilterSidebar from "~/components/filter-sidebar";
import { SimpleCard } from "~/components/ui/card";
import { config } from "~/config";
import { resolveProductSlug } from "~/lib/get-locale-translation";
import type { ProductType } from "~/lib/client/types.gen";

function pickTrimmed(s: string | undefined | null): string {
  if (typeof s !== "string") return "";
  const t = s.trim();
  return t;
}

/** Resolves a label for the product type; API sometimes omits `name` / `translations`. */
function productTypeDisplayName(pt: ProductType, langCode: string): string {
  const code = langCode.split("-")[0];
  const fromTranslations =
    pickTrimmed(pt.translations?.[code]?.name) ||
    pickTrimmed(pt.translations?.en?.name) ||
    pickTrimmed(pt.translations?.ar?.name);
  const primary = fromTranslations || pickTrimmed(pt.name);
  if (primary) return primary;
  if (pt.slug)
    return formatProductType(slugToProductType(pt.slug));
  if (pt.code) return formatProductType(pt.code);
  return "";
}

const LIMIT = 30;

type ShopListMeta = {
  total: number;
};

export const serializeShopURL = createSerializer(shopSearchParamsSchema);
const loadSearchParams = createLoader(shopSearchParamsSchema);

function collectSubcategoryIds(categoriesData: any[]): string[] {
  const ids: string[] = [];
  for (const cat of categoriesData ?? []) {
    const subs = (cat?.subcategories ?? []) as Array<{ id?: string }>;
    for (const sub of subs) {
      if (sub?.id) ids.push(sub.id);
    }
  }
  return Array.from(new Set(ids));
}

/**
 * Compute accurate per-subcategory counts under the active filters by asking
 * the API for `meta.total` per subcategory id (which matches both category_id
 * and sub_category_id on the backend).
 */
async function getSubcategoryCountsById({
  baseQuery,
  subcategoryIds,
}: {
  baseQuery: Record<string, any>;
  subcategoryIds: string[];
}): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (!subcategoryIds.length) return counts;

  await Promise.all(
    subcategoryIds.map(async (id) => {
      try {
        const response = await getApiProductsPublic({
          query: {
            ...baseQuery,
            categoryId: id,
            page: 1,
            limit: 1,
          } as any,
        });
        if (!response.error) {
          counts[id] = response.data?.meta?.total ?? 0;
        } else {
          counts[id] = 0;
        }
      } catch {
        counts[id] = 0;
      }
    })
  );
  return counts;
}

// Category name mapping for each product type
export async function loader({ request, params }: Route.LoaderArgs) {
  const productTypeSlug = params.productType;
  const locale = await getLocaleFromRequest(request);
  const languageId =
    locale === "ar" ? config.languageIds.ar : config.languageIds.en;

  // Fetch product types to validate slug
  const productTypesResponse = await getApiProductTypes();
  
  if (productTypesResponse.error) {
    throw new Response("Failed to fetch product types", { status: 500 });
  }
  
  const productTypes = productTypesResponse.data?.data || [];
  
  // Find matching product type by slug
  const productType = productTypes.find(pt => pt.slug === productTypeSlug);
  
  if (!productType) {
    throw new Response("Invalid product type", { status: 404 });
  }

  const searchParams = stripNulls(loadSearchParams(request));
  const queryClient = new QueryClient();

  const productQueryBase = {
    storeId: defaultParams.storeId,
    languageId,
    productTypeId: productType.id,
    search: searchParams.search ?? undefined,
    carBrand: searchParams.carBrand ?? undefined,
    carModel: searchParams.carModel ?? undefined,
    carYear: searchParams.carYear ?? undefined,
    categoryId:
      searchParams.categories && searchParams.categories.length > 0
        ? searchParams.categories.join(",")
        : undefined,
    sortBy: searchParams.sortBy ?? undefined,
    sortOrder: searchParams.sortOrder ?? undefined,
  };

  // Fetch categories and products in parallel
  const [categoriesResponse, productsResponse] = await Promise.all([
    getApiCategoriesPublic({
      query: {
        storeId: defaultParams.storeId,
        productTypeId: productType.id,
        languageId,
      },
    }),
    getApiProductsPublic({
      query: {
        ...productQueryBase,
        limit: LIMIT,
        page: 1,
      } as any,
    }),
  ]);

  const enrichedProductsResponse =
    locale === "ar" && productsResponse.data?.data?.length
      ? await (async () => {
          const productIds = productsResponse.data.data.map((product: any) => product.id);
          const englishProductsResponse = await getApiProductsPublic({
            query: {
              storeId: defaultParams.storeId,
              languageId: config.languageIds.en,
              productIds: productIds.join(","),
            },
          });

          const slugPairs = (englishProductsResponse.data?.data ?? [])
            .map((product) => {
              const slug = resolveProductSlug(product, {
                preferEnglish: true,
                language: "en",
              });
              return slug ? ([product.id, slug] as const) : null;
            })
            .filter((e): e is readonly [string, string] => e !== null);
          const englishSlugById = new Map<string, string>(slugPairs);

          return {
            ...productsResponse,
            data: {
              ...productsResponse.data,
              data: productsResponse.data.data.map((product: any) => ({
                ...product,
                slug_en: englishSlugById.get(product.id),
              })),
            },
          };
        })()
      : productsResponse;

  const filteredProductsResponse =
    enrichedProductsResponse.data?.data && Array.isArray(enrichedProductsResponse.data.data)
      ? {
          ...enrichedProductsResponse,
          data: {
            ...enrichedProductsResponse.data,
            data: enrichedProductsResponse.data.data.filter((product: any) =>
              product?.translations?.some(
                (translation: any) =>
                  translation.languageCode === locale &&
                  translation.slug &&
                  translation.name
              )
            ),
          },
        }
      : enrichedProductsResponse;

  const subcategoryIds = collectSubcategoryIds(
    categoriesResponse.data?.data ?? []
  );
  const countFilters = {
    storeId: productQueryBase.storeId,
    languageId: productQueryBase.languageId,
    productTypeId: productQueryBase.productTypeId,
    carBrand: productQueryBase.carBrand,
    carModel: productQueryBase.carModel,
    carYear: productQueryBase.carYear,
    search: productQueryBase.search,
  };
  const hasFiltersAffectingCounts = Boolean(
    countFilters.carBrand ||
      countFilters.carModel ||
      countFilters.carYear ||
      countFilters.search
  );
  if (hasFiltersAffectingCounts && subcategoryIds.length > 0) {
    const countsById = await getSubcategoryCountsById({
      baseQuery: countFilters,
      subcategoryIds,
    });
    const countsQueryKey = subcategoryCountsQueryOptions({
      filters: countFilters,
      subcategoryIds,
    }).queryKey;
    queryClient.setQueryData(countsQueryKey, countsById);
  }

  const productsQueryOptions = productsByTypeInfiniteQueryOptions({
    productTypeId: productType.id,
    params: searchParams,
    limit: LIMIT,
  });

  if (!filteredProductsResponse.error && filteredProductsResponse.data) {
    queryClient.setQueryData(productsQueryOptions.queryKey, {
      pages: [filteredProductsResponse.data],
      pageParams: [1],
    });
  }

  return {
    productsResponse: filteredProductsResponse,
    categoriesResponse,
    searchParams,
    countQueryBase: {
      storeId: defaultParams.storeId,
      languageId,
      productTypeId: productType.id,
    },
    productType,
    productTypeSlug,
    dehydratedState: dehydrate(queryClient),
  };
}

export const meta: Route.MetaFunction = ({ data }: any) => {
  if (!data) {
    return [{ title: "Shop - MotoGT" }];
  }

  const nameFromApi = data.productType?.name;
  const slug = data.productTypeSlug ?? "";
  const typeLabel =
    (typeof nameFromApi === "string" && nameFromApi.trim()) ||
    (slug ? formatProductType(slugToProductType(slug)) : "") ||
    "Shop";

  return [
    { title: `${typeLabel} - Shop - MotoGT` },
    {
      name: "description",
      content: `Browse our ${typeLabel.toLowerCase()} collection`,
    },
    { property: "og:title", content: `${typeLabel} - Shop - MotoGT` },
    { property: "og:image", content: "https://motogt.com/og-image.jpg" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:type", content: "website" },
  ];
};

export default function ShopByProductType({
  loaderData,
}: Route.ComponentProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { productType } = loaderData;

  const { t, i18n } = useTranslation("shop");
  const [listMeta, setListMeta] = useState<ShopListMeta>(() => ({
    total: loaderData.productsResponse?.data?.meta?.total ?? 0,
  }));

  useEffect(() => {
    const m = loaderData.productsResponse?.data?.meta;
    setListMeta({ total: m?.total ?? 0 });
  }, [loaderData.productsResponse]);

  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Section */}
        <section className="mb-8">
          <ProductSearch />
        </section>

        {/* Page Title */}
        <div className="flex items-center justify-between gap-3 mb-6 min-w-0">
          <h1
            dir="auto"
            className="flex min-w-0 flex-1 flex-wrap items-baseline gap-2 text-[18px] leading-[150%] tracking-[-0.198px] text-[#000]"
          >
            <span className="min-w-0 break-words font-black italic">
              {productTypeDisplayName(productType, i18n.language)}
            </span>
            <span className="shrink-0 text-[14px] font-normal not-italic tracking-[-0.154px] text-[rgba(0,0,0,0.50)]">
              {t("listing.partsCount", { count: listMeta.total })}
            </span>
          </h1>
          <div className="shrink-0">
          <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" className="lg:hidden bg-white rounded dark:bg-white">
                <FilterIcon className="mr-2 h-4 w-4" />
                {t("filters.title")}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="p-4 max-h-[80vh] overflow-y-auto pb-8">
                <FilterSidebar
                  variant="drawer"
                  categoriesResponse={loaderData.categoriesResponse}
                  productsResponse={loaderData.productsResponse}
                  countQueryBase={loaderData.countQueryBase}
                />
              </div>
            </DrawerContent>
          </Drawer>
          </div>
        </div>

        {/* Products Grid with Sidebar */}
        <div className="flex gap-4 items-start">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block">
            <FilterSidebar
              categoriesResponse={loaderData.categoriesResponse}
              productsResponse={loaderData.productsResponse}
              countQueryBase={loaderData.countQueryBase}
            />
          </aside>

          {/* Products Grid */}
          <main className="flex-1 min-w-0">
            <Suspense
              fallback={
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              }
            >
              <Await resolve={loaderData.productsResponse}>
                {(data) => (
                  <ProductsGrid
                    initialData={data}
                    productType={productType}
                    onListMetaChange={setListMeta}
                  />
                )}
              </Await>
            </Suspense>
          </main>
        </div>
      </div>
    </HydrationBoundary>
  );
}

function ProductsGrid({
  initialData,
  productType,
  onListMetaChange,
}: {
  initialData: any;
  productType: { id: string; code: string; slug: string; name: string };
  onListMetaChange: (meta: ShopListMeta) => void;
}) {
  // Safely extract initial data
  const safeInitialData = useMemo(() => {
    if (!initialData) return undefined;
    if (initialData.error) return undefined;
    // initialData is the full response object, we need initialData.data which contains {data: [], meta: {}}
    if (!initialData.data) return undefined;
    return initialData.data;
  }, [initialData]);
  const [searchParams] = useQueryStates(shopSearchParamsSchema);
  const { i18n } = useTranslation("shop");
  const currentLang = (i18n.language || "").split("-")[0];
  const [urlSearchParams] = useSearchParams();
  const { ref, inView } = useInView();
  const sortParam = urlSearchParams.get("sort");
  const [resolvedSortBy, resolvedSortOrder] = useMemo(() => {
    if (searchParams.sortBy && searchParams.sortOrder) {
      return [searchParams.sortBy, searchParams.sortOrder];
    }
    if (sortParam) {
      const [sortBy, sortOrder] = sortParam.split(/[_-]/);
      if (sortBy && sortOrder) {
        return [sortBy, sortOrder];
      }
    }
    return [null, null];
  }, [searchParams.sortBy, searchParams.sortOrder, sortParam]);
  const hasActiveFilters = useMemo(() => {
    return Boolean(
      searchParams.search ||
        searchParams.carBrand ||
        searchParams.carModel ||
        searchParams.carYear ||
        (searchParams.categories && searchParams.categories.length > 0) ||
        resolvedSortBy ||
        resolvedSortOrder
    );
  }, [
    searchParams.search,
    searchParams.carBrand,
    searchParams.carModel,
    searchParams.carYear,
    searchParams.categories,
    resolvedSortBy,
    resolvedSortOrder,
  ]);
  const productsQueryParams = useMemo(
    () => ({
      search: searchParams.search ?? null,
      carBrand: searchParams.carBrand ?? null,
      carModel: searchParams.carModel ?? null,
      carYear: searchParams.carYear ?? null,
      categories: searchParams.categories ?? null,
      sortBy: resolvedSortBy ?? null,
      sortOrder: resolvedSortOrder ?? null,
    }),
    [
      searchParams.search,
      searchParams.carBrand,
      searchParams.carModel,
      searchParams.carYear,
      searchParams.categories,
      resolvedSortBy,
      resolvedSortOrder,
    ]
  );

  const productsQueryOptions = productsByTypeInfiniteQueryOptions({
    productTypeId: productType.id,
    params: productsQueryParams,
    limit: LIMIT,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isPending,
    error,
  } = useInfiniteQuery({
    ...productsQueryOptions,
    initialData: !hasActiveFilters
      ? safeInitialData
        ? {
            pages: [safeInitialData],
            pageParams: [1],
          }
        : undefined
      : undefined,
  });

  useEffect(() => {
    if (!data?.pages?.length) return;
    const first = data.pages[0]?.meta;
    if (!first) return;
    onListMetaChange({ total: first.total ?? 0 });
  }, [data?.pages, onListMetaChange]);

  const showProductsSkeleton = isPending || (isFetching && !data);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // data.pages contains response.data objects, so access data directly
  const allProducts = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => {
      // page is response.data, which has { data: ProductItem[], meta: {...} }
      if (!page || !page.data || !Array.isArray(page.data)) return [];
      return page.data;
    });
  }, [data]);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-destructive mb-2">Error loading products</p>
        <p className="text-sm text-muted-foreground mb-4">
          {error instanceof Error ? error.message : "Failed to fetch products"}
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  if (showProductsSkeleton) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (allProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">
          No products found matching your filters.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {allProducts
          .filter((product) =>
            product?.translations?.some(
              (translation) =>
                translation.languageCode === currentLang &&
                translation.slug &&
                translation.name
            )
          )
          .map((product) => {
          // Safety check: ensure product has required properties
          if (!product || !product.id || !product.translations?.[0]) {
            return null;
          }
          return (
            <ProductCard
              key={product.id}
              product={product}
              carFilter={{
                carBrand: searchParams.carBrand ?? null,
                carModel: searchParams.carModel ?? null,
                carYear: searchParams.carYear ?? null,
              }}
            />
          );
        })}
      </div>

      {hasNextPage && (
        <div ref={ref} className="mt-8 flex justify-center">
          {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin" />}
        </div>
      )}
    </>
  );
}
