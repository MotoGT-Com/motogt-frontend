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
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger, } from "~/components/ui/drawer";
import { Label } from "@radix-ui/react-label";
import { Badge } from "~/components/ui/badge";
import { createLoader, createSerializer, parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates, } from "nuqs";
import type { CheckedState } from "@radix-ui/react-checkbox";
import FilterSidebar from "~/components/filter-sidebar";
import { useTranslation } from "react-i18next";
import { getLocaleFromRequest } from "~/lib/i18n-cookie";
import { config } from "~/config";
import { resolveProductSlug } from "~/lib/get-locale-translation";

const LIMIT = 30;

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
  carId: parseAsString,
  carBrand: parseAsString,
  carModel: parseAsString,
  carYear: parseAsInteger,
  productType: parseAsStringEnum(["car_parts", "riding_gear"]),
};

const loadSearchParams = createLoader(shopSearchParamsSchema);

export const serializeShopURL = createSerializer(shopSearchParamsSchema).bind(
  null,
  href("/shop")
);

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

    const englishSlugById = new Map(
      (englishProductsResponse.data?.data ?? [])
        .map((product: any) => [
          product.id,
          resolveProductSlug(product, { preferEnglish: true, language: "en" }),
        ])
        .filter((entry) => entry[1])
    );

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
    {
      title: "Shop - MotoGT",
    },
  ];
};

export default function Shop({ loaderData }: Route.ComponentProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { t, i18n } = useTranslation("shop");

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Section */}
        <section className="mb-8">
          <ProductSearch />
        </section>

        {/* Page Title */}
        <section className="mb-6 flex items-center justify-between">
          <div>
            <Suspense fallback={
              <h1 className="text-[18px] font-black italic leading-[150%] tracking-[-0.198px] text-[#000]">
                {t("title")}
              </h1>
            }>
              <Await resolve={loaderData.productsResponse}>
                {(data) => {
                  const totalCount = data?.data?.meta?.total ?? 0;
                  return (
                    <h1 className="text-[18px] font-black italic leading-[150%] tracking-[-0.198px] text-[#000]">
                      {t("title")}{" "}
                      <span className="text-[14px] font-normal not-italic leading-[150%] tracking-[-0.154px] text-[rgba(0,0,0,0.50)]">
                        ({totalCount})
                      </span>
                    </h1>
                  );
                }}
              </Await>
            </Suspense>
          </div>
          <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" className="lg:hidden">
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <ProductCardSkeleton key={index} />
                  ))}
                </div>
              }
            >
              <ProductsGrid />
            </Suspense>
          </main>
        </div>
      </div>
    </>
  );
}

function ProductsGrid() {
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
    fetchNextPage,
    hasNextPage,
  } = useSuspenseInfiniteQuery({
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
          sortBy: resolvedSortBy ?? undefined,
          sortOrder: resolvedSortOrder ?? undefined,
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

      const englishSlugById = new Map(
        (englishResponse.data?.data ?? [])
          .map((product: any) => [
            product.id,
            resolveProductSlug(product, { preferEnglish: true, language: "en" }),
          ])
          .filter((entry) => entry[1])
      );

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
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderUniqueProducts = () => {
    const uniqueProducts = new Map();

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
          (translation) =>
            translation.languageCode === currentLang &&
            translation.slug &&
            translation.name
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 w-full">
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
