import { PlusIcon, MinusIcon, FilterIcon, Loader2, X, ChevronUp } from "lucide-react";
import { AccordionDropdownButton } from "~/components/accordion-dropdown-button";
import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { Await, href, Link, redirect, useLoaderData, useNavigate, useSearchParams, } from "react-router";
import { ProductCard, ProductCardSkeleton } from "~/components/product-card";
import { ProductSearch } from "~/components/product-search";
import { Button, buttonVariants } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { cn, stripNulls, productTypeToSlug } from "~/lib/utils";
import type { Route } from "./+types/_main.shop._index";
import { getApiProductsPublic, getApiCategoriesPublic, type GetApiCategoriesPublicResponse, } from "~/lib/client";
import { defaultParams } from "~/lib/api-client";
import { InlineAccordion, InlineAccordionContent, InlineAccordionItem, InlineAccordionTrigger, } from "~/components/ui/inline-accordion";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger, } from "~/components/ui/drawer";
import { Label } from "@radix-ui/react-label";
import { Badge } from "~/components/ui/badge";
import { useQueryStates } from "nuqs";
import type { CheckedState } from "@radix-ui/react-checkbox";
import FilterSidebar from "~/components/filter-sidebar";
import { useTranslation } from "react-i18next";
import { getLocaleFromRequest } from "~/lib/i18n-cookie";
import { config } from "~/config";
import { resolveProductSlug } from "~/lib/get-locale-translation";
import {
  loadShopSearchParams,
  shopSearchParamsSchema,
} from "~/lib/shop-search-params";

const LIMIT = 30;

type ShopListMeta = {
  total: number;
};

export { shopSearchParamsSchema, serializeShopURL } from "~/lib/shop-search-params";

const loadSearchParams = loadShopSearchParams;

const hasLocaleTranslation = (product: any, locale: string) => {
  return product?.translations?.some(
    (translation: any) =>
      translation.languageCode === locale && translation.slug && translation.name
  );
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const queryProductType = url.searchParams.get("productType");

  // Redirect old query param to new URL structure
  if (queryProductType) {
    const slug = productTypeToSlug(queryProductType);
    url.pathname = `/shop/${slug}`;
    url.searchParams.delete("productType");
    throw redirect(url.toString());
  }

  const searchParams = stripNulls(loadSearchParams(request));
  const locale = await getLocaleFromRequest(request);
  const languageId =
    locale === "ar" ? config.languageIds.ar : config.languageIds.en;
  // Fetch products with search and filter parameters

  const categoriesResponse = await getApiCategoriesPublic({
    query: {
      storeId: defaultParams.storeId,
      languageId,
    },
  });

  let productsResponse = await getApiProductsPublic({
    query: {
      storeId: defaultParams.storeId,
      languageId,
      limit: LIMIT,
      search: searchParams.search,
      carId: searchParams.carId,
      carBrand: searchParams.carBrand,
      carModel: searchParams.carModel,
      carYear: searchParams.carYear,
      categoryId: searchParams.categories.join(","),
      productIds: searchParams.productIds.join(","),
      sortBy: searchParams.sortBy,
      sortOrder: searchParams.sortOrder,
    },
  });

  if (locale === "ar" && productsResponse.data?.data?.length) {
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

    productsResponse = {
      ...productsResponse,
      data: {
        ...productsResponse.data,
        data: productsResponse.data.data.map((product: any) => ({
          ...product,
          slug_en: englishSlugById.get(product.id),
        })),
      },
    };
  }

  if (productsResponse.data?.data) {
    const filteredProducts = productsResponse.data.data.filter((product: any) =>
      hasLocaleTranslation(product, locale)
    );
    productsResponse = {
      ...productsResponse,
      data: {
        ...productsResponse.data,
        data: filteredProducts,
      },
    };
  }

  return {
    productsResponse,
    categoriesResponse,
    searchParams,
  };
}

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Shop - MotoGT" },
    { property: "og:title", content: "Shop - MotoGT" },
    { property: "og:image", content: "https://motogt.com/og-image.jpg" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: "https://motogt.com/shop" },
    { property: "og:type", content: "website" },
  ];
};

export default function Shop({ loaderData }: Route.ComponentProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { t, i18n } = useTranslation("shop");
  const [listMeta, setListMeta] = useState<ShopListMeta>(() => ({
    total: loaderData.productsResponse?.data?.meta?.total ?? 0,
  }));

  useEffect(() => {
    const m = loaderData.productsResponse?.data?.meta;
    setListMeta({ total: m?.total ?? 0 });
  }, [loaderData.productsResponse]);

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Section */}
        <section className="mb-8">
          <ProductSearch />
        </section>

        {/* Page Title */}
        <section className="mb-6 flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h1
              dir="auto"
              className="flex min-w-0 flex-wrap items-baseline gap-2 text-[18px] leading-[150%] tracking-[-0.198px] text-[#000]"
            >
              <span className="min-w-0 break-words font-black italic">
                {t("title")}
              </span>
              <span className="shrink-0 text-[14px] font-normal not-italic tracking-[-0.154px] text-[rgba(0,0,0,0.50)]">
                {t("listing.partsCount", { count: listMeta.total })}
              </span>
            </h1>
          </div>
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
                />
              </div>
            </DrawerContent>
          </Drawer>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="flex gap-8 items-start">
          {/* Left Sidebar - Filters */}
          <aside className="hidden lg:block">
            <FilterSidebar
              categoriesResponse={loaderData.categoriesResponse}
              productsResponse={loaderData.productsResponse}
            />
          </aside>
          {/* Right Side - Product Grid */}
          <main className="flex-1 min-w-0">
            <Suspense
              fallback={
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <ProductCardSkeleton key={index} />
                  ))}
                </div>
              }
            >
              <ProductsGrid onListMetaChange={setListMeta} />
            </Suspense>
          </main>
        </div>
      </div>
    </>
  );
}

function ProductsGrid({
  onListMetaChange,
}: {
  onListMetaChange: (meta: ShopListMeta) => void;
}) {
  const { productsResponse } = useLoaderData<typeof loader>();
  const [searchParams] = useQueryStates(shopSearchParamsSchema);
  const [urlSearchParams] = useSearchParams();
  const { ref, inView } = useInView();
  const { i18n } = useTranslation("shop");
  const currentLang = (i18n.language || "").split("-")[0];
  const primaryLanguageId =
    currentLang === "ar" ? config.languageIds.ar : config.languageIds.en;
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

  // Build stable query key that includes all search params
  const queryKey = useMemo(
    () => [
      "products",
      searchParams.search ?? "",
      searchParams.carId ?? "",
      searchParams.carBrand ?? "",
      searchParams.carModel ?? "",
      searchParams.carYear ?? null,
      searchParams.categories?.sort().join(",") ?? "",
      searchParams.productIds?.sort().join(",") ?? "",
      resolvedSortBy ?? null,
      resolvedSortOrder ?? null,
    ],
    [
      searchParams.search,
      searchParams.carId,
      searchParams.carBrand,
      searchParams.carModel,
      searchParams.carYear,
      searchParams.categories,
      searchParams.productIds,
      resolvedSortBy,
      resolvedSortOrder,
    ]
  );

  const {
    data: productsPages,
    isFetchingNextPage,
    isFetching,
    isPending,
    fetchNextPage,
    hasNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: [...queryKey, currentLang],
    queryFn: async ({ pageParam }) => {
      // Use initial data only for first page when no filters are applied
      if (pageParam === 1 && !searchParams.search && !searchParams.carId && 
          !searchParams.carBrand && !searchParams.carModel && !searchParams.carYear &&
          (!searchParams.categories || searchParams.categories.length === 0) &&
          (!searchParams.productIds || searchParams.productIds.length === 0) &&
          !resolvedSortBy && !resolvedSortOrder) {
        const response = await productsResponse;
        if (response.error) {
          throw new Error(response.error.error.message || "Products not found");
        }
        return response.data;
      }
      
      const response = await getApiProductsPublic({
        query: {
          page: pageParam,
          limit: LIMIT,
          storeId: defaultParams.storeId,
          languageId: primaryLanguageId,
          search: searchParams.search ?? undefined,
          carId: searchParams.carId ?? undefined,
          carBrand: searchParams.carBrand ?? undefined,
          carModel: searchParams.carModel ?? undefined,
          carYear: searchParams.carYear ?? undefined,
          categoryId: searchParams.categories?.join(",") ?? undefined,
          productIds: searchParams.productIds?.join(",") ?? undefined,
          sortBy: resolvedSortBy as
            | "name"
            | "price"
            | "createdAt"
            | "stockQuantity"
            | "carCompatibility"
            | undefined,
          sortOrder: resolvedSortOrder as "asc" | "desc" | undefined,
        },
      });
      if (response.error) {
        throw new Error(response.error.error?.message || "Products not found");
      }

      if (currentLang !== "ar" || !response.data?.data?.length) {
        return response.data;
      }

      const productIds = response.data.data.map((product: any) => product.id);
      const englishResponse = await getApiProductsPublic({
        query: {
          storeId: defaultParams.storeId,
          languageId: config.languageIds.en,
          productIds: productIds.join(","),
        },
      });

      const slugPairs = (englishResponse.data?.data ?? [])
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
        ...response.data,
        data: response.data.data.map((product: any) => ({
          ...product,
          slug_en: englishSlugById.get(product.id),
        })),
      };
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.meta.hasNext ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  useEffect(() => {
    if (!productsPages?.pages?.length) return;
    const first = productsPages.pages[0]?.meta;
    if (!first) return;
    onListMetaChange({ total: first.total ?? 0 });
  }, [productsPages?.pages, onListMetaChange]);

  /** First page / filter change: show skeleton. Pagination uses bottom spinner only. */
  const showProductsSkeleton =
    isPending || (isFetching && !productsPages);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (error) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <h3 className="text-xl font-semibold mb-4">Could not load products</h3>
        <p className="mb-4 text-sm">{error instanceof Error ? error.message : "Something went wrong"}</p>
        <Button asChild variant="outline">
          <Link to={href("/shop")}>Try again</Link>
        </Button>
      </div>
    );
  }

  if (showProductsSkeleton) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
        {Array.from({ length: 9 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!productsPages?.pages?.length) {
    return null;
  }

  const renderUniqueProducts = () => {
    const uniqueProducts = new Map<string, (typeof productsPages.pages)[number]["data"][number]>();

    productsPages.pages.forEach((page) => {
      page.data.forEach((product) => {
        if (!uniqueProducts.has(product.id)) {
          uniqueProducts.set(product.id, product);
        }
      });
    });

    return Array.from(uniqueProducts.values())
      .filter((product) =>
        product?.translations?.some(
          (translation: {
            languageCode: string;
            slug?: string;
            name?: string;
          }) =>
            translation.languageCode === currentLang &&
            !!translation.slug &&
            !!translation.name
        )
      )
      .map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          carFilter={{
            carBrand: searchParams.carBrand ?? null,
            carModel: searchParams.carModel ?? null,
            carYear: searchParams.carYear ?? null,
            carId: searchParams.carId ?? null,
          }}
        />
      ));
  };

  return (
    <>
      {productsPages.pages.length === 0 ||
      productsPages.pages[0].data.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <h3 className="text-xl font-semibold mb-4">No products found</h3>
          <p className="mb-8">
            {/* {loaderData.searchParams.search
                    ? `No products match your search "${loaderData.searchParams.search}"`
                    : "No products available in this category"} */}
          </p>
          <Button
            asChild
            size="lg"
            className="font-koulen text-xl h-12 opacity-80"
          >
            <Link to="/">Continue Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
          {renderUniqueProducts()}
          <div className="col-span-full flex items-center justify-center h-20">
            {isFetchingNextPage && (
              <Loader2 className="size-10 text-primary animate-spin" />
            )}
          </div>
          <div ref={ref} />
        </div>
      )}
    </>
  );
}
