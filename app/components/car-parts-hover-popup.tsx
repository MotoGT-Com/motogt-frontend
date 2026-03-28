import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { useQuery } from "@tanstack/react-query";
import { homeSubcategoriesQueryOptions, garageCarsQueryOptions } from "~/lib/queries";
import { Link, href, useRouteLoaderData } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getApiProductsPublic, getApiProductsPublicSlugBySlug } from "~/lib/client/sdk.gen";
import { defaultParams } from "~/lib/api-client";
import { getCurrentLanguageId, LANGUAGE_IDS } from "~/lib/constants";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import type { Route } from "../routes/+types/_main";
import { buildProductPath } from "~/lib/product-url";
import { useCurrency } from "~/hooks/use-currency";

// Fallback subcategories to ensure we always have 10 categories (labels localized via t())
const FALLBACK_SUBCATEGORY_KEYS = [
  "frontSplitter",
  "vents",
  "frontBumper",
  "spoiler",
  "diffuser",
  "steeringTrim",
  "rims",
  "controlTrim",
  "floorMat",
  "ladder",
] as const;

/**
 * CarPartsHoverPopup — hover on "Car Parts" nav: subcategories + one featured product.
 * Layout row uses direction:ltr so RTL locales keep the product card visible (flex mirror was clipping it).
 */
type SubcategoryRow = {
  id: string;
  name?: string | null;
  translations?: { languageCode: string; name?: string | null }[];
};

function subcategoryLabel(row: SubcategoryRow, fallback: string): string {
  const translations = row.translations;
  if (translations?.length) {
    const picked = getLocalizedTranslation(translations as { languageCode: string; name?: string | null }[]);
    if (picked?.name) return picked.name;
  }
  if (row.name) return row.name;
  return fallback;
}

function resolveCarPartsProductType(
  productTypes: NonNullable<Route.ComponentProps["loaderData"]["productTypes"]>
) {
  return productTypes.find(
    (pt) =>
      pt.code === "car_parts" ||
      pt.code === "car-parts" ||
      pt.slug === "car-parts" ||
      pt.slug === "car_parts"
  );
}

const DEFAULT_FEATURED_SLUG = "jetour-t2-matt-black-body-kit";

export function CarPartsHoverPopup({ children }: { children: React.ReactNode }) {
  const { i18n, t } = useTranslation("common");
  const { data: subcategories, isLoading: subcategoriesLoading } = useQuery(
    homeSubcategoriesQueryOptions()
  );

  const loaderData = useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const isAuthenticated = loaderData?.isAuthenticated;
  const productTypes = loaderData?.productTypes ?? [];

  const carPartsProductType = useMemo(() => resolveCarPartsProductType(productTypes), [productTypes]);

  const { data: garageCarsData, isLoading: garageCarsLoading } = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });

  const userCars = garageCarsData?.userCars ?? [];
  const hasGarageCars = userCars.length > 0;

  const randomCar = useMemo(() => {
    if (!hasGarageCars) return null;
    const idx = Math.floor(Math.random() * userCars.length);
    return userCars[idx] ?? null;
  }, [hasGarageCars, userCars]);

  const carYear =
    randomCar?.carDetails.yearFrom ??
    randomCar?.carDetails.yearTo ??
    undefined;

  const garageQueryActive = hasGarageCars && !!carPartsProductType;

  const garageProductsQuery = useQuery({
    queryKey: [
      "products",
      "garage-featured",
      randomCar?.carId,
      carYear,
      carPartsProductType?.id,
      getCurrentLanguageId(),
    ],
    queryFn: async () => {
      if (!randomCar || !carPartsProductType) return [];
      const langPrimary = getCurrentLanguageId();
      const fetchForLang = async (languageId: string) => {
        const response = await getApiProductsPublic({
          query: {
            storeId: defaultParams.storeId,
            languageId,
            productTypeId: carPartsProductType.id,
            carBrand: randomCar.carDetails.brand,
            carModel: randomCar.carDetails.model,
            carYear,
            limit: 20,
            page: 1,
            // API supports productTypeId + car filters; OpenAPI types lag behind.
          } as any,
        });
        if (response.error) throw response.error;
        return response.data?.data ?? [];
      };
      let list = await fetchForLang(langPrimary);
      if (list.length === 0 && langPrimary !== LANGUAGE_IDS.en) {
        list = await fetchForLang(LANGUAGE_IDS.en);
      }
      return list;
    },
    enabled: garageQueryActive,
  });

  const garageProductsReady = !garageQueryActive || garageProductsQuery.isFetched;
  const useGarageFeatured =
    garageQueryActive && (garageProductsQuery.data?.length ?? 0) > 0;

  const defaultProductQuery = useQuery({
    queryKey: [
      "products",
      "default-featured",
      DEFAULT_FEATURED_SLUG,
      getCurrentLanguageId(),
      "ar-fallback-v1",
    ],
    queryFn: async () => {
      const fetchBySlug = async (languageId: string) => {
        const response = await getApiProductsPublicSlugBySlug({
          path: { slug: DEFAULT_FEATURED_SLUG },
          query: {
            storeId: defaultParams.storeId,
            languageId,
          },
        });
        if (response.error) return null;
        return response.data?.data ?? null;
      };

      const langPrimary = getCurrentLanguageId();
      const primary = await fetchBySlug(langPrimary);
      if (primary) return primary;
      if (langPrimary !== LANGUAGE_IDS.en) {
        const en = await fetchBySlug(LANGUAGE_IDS.en);
        if (en) return en;
      }

      // Slug is ASCII; some stores only resolve it under English languageId — if still empty, grab any car-part.
      const partsType = carPartsProductType;
      if (!partsType) return null;
      const fetchBrowse = async (languageId: string) => {
        const response = await getApiProductsPublic({
          query: {
            storeId: defaultParams.storeId,
            languageId,
            productTypeId: partsType.id,
            limit: 1,
            page: 1,
            sortBy: "createdAt",
            sortOrder: "desc",
          } as any,
        });
        if (response.error) return null;
        const row = response.data?.data?.[0];
        return row ?? null;
      };
      const browsePrimary = await fetchBrowse(langPrimary);
      if (browsePrimary) return browsePrimary;
      if (langPrimary !== LANGUAGE_IDS.en) {
        return fetchBrowse(LANGUAGE_IDS.en);
      }
      return null;
    },
    enabled: !hasGarageCars || (garageProductsReady && !useGarageFeatured),
    staleTime: 60_000,
  });

  const garageFeaturedProduct = useMemo(() => {
    const list = garageProductsQuery.data;
    if (!useGarageFeatured || !list?.length) return null;
    const i = Math.floor(Math.random() * list.length);
    return list[i] ?? null;
  }, [useGarageFeatured, garageProductsQuery.data]);

  const featuredProduct = garageFeaturedProduct ?? defaultProductQuery.data ?? null;

  const productsLoading =
    garageCarsLoading ||
    (garageQueryActive && garageProductsQuery.isPending) ||
    ((!hasGarageCars || (garageProductsReady && !useGarageFeatured)) && defaultProductQuery.isPending);

  const { selectedCurrency, convertPrice } = useCurrency();
  const [convertedPrice, setConvertedPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!featuredProduct) {
      setConvertedPrice(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await convertPrice(featuredProduct.price, "JOD");
      if (!cancelled) setConvertedPrice(r.convertedAmount);
    })();
    return () => {
      cancelled = true;
    };
  }, [featuredProduct?.id, featuredProduct?.price, selectedCurrency]);

  const apiSubcategories = subcategories?.slice(0, 10) || [];
  const categoryFallback = t("nav.carPartsHoverCategoryFallback");
  const top10Subcategories = Array.from({ length: 10 }, (_, index) => {
    if (apiSubcategories[index]) {
      const row = apiSubcategories[index] as SubcategoryRow;
      return {
        id: row.id,
        label: subcategoryLabel(row, categoryFallback),
      };
    }
    const key = FALLBACK_SUBCATEGORY_KEYS[index];
    return {
      id: `fallback-${index}`,
      label: key ? t(`nav.carPartsHoverFallback.${key}`) : categoryFallback,
    };
  });

  const leftColumn = top10Subcategories.slice(0, 5);
  const rightColumn = top10Subcategories.slice(5, 10);
  const isRTL = (i18n.language || "").startsWith("ar");

  const shopCarPartsHref = (categoryId: string) =>
    `${href("/shop/:productType", { productType: "car-parts" })}?categories=${encodeURIComponent(categoryId)}`;

  return (
    <HoverCard key={i18n.language} openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="inline-flex">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent
        className="hidden md:block w-auto max-w-[min(100vw-1.5rem,36rem)] p-4 bg-[#f2f2f2] border border-[#e6e6e6] rounded-[2px] shadow-[0_4px_10px_0_rgba(0,0,0,0.10)] z-50"
        sideOffset={12}
        align="start"
        collisionPadding={16}
      >
        <div className="flex flex-col gap-4 font-sans" dir={isRTL ? "rtl" : "ltr"}>
          <h3 className="text-sm font-semibold text-black">{t("nav.carPartsHoverTitle")}</h3>

          {/* Physical LTR row so featured card stays on the visual right in RTL (avoids viewport clip). */}
          <div className="flex flex-row items-start gap-6 min-w-0" dir="ltr">
            <div className="flex gap-8 flex-1 min-w-0" dir={isRTL ? "rtl" : "ltr"}>
              <div className="flex flex-col space-y-3 min-w-0">
                {subcategoriesLoading ? (
                  <div className="text-sm text-black/50 py-2">{t("buttons.loading")}</div>
                ) : (
                  leftColumn.map((subcategory) => (
                    <Link
                      key={subcategory.id}
                      to={shopCarPartsHref(subcategory.id)}
                      className="text-sm font-light text-black hover:text-[#cf172f] transition-colors duration-200 truncate"
                    >
                      {subcategory.label}
                    </Link>
                  ))
                )}
              </div>

              <div className="flex flex-col space-y-3 min-w-0">
                {subcategoriesLoading ? (
                  <div className="text-sm text-black/50 py-2">{t("buttons.loading")}</div>
                ) : (
                  rightColumn.map((subcategory) => (
                    <Link
                      key={subcategory.id}
                      to={shopCarPartsHref(subcategory.id)}
                      className="text-sm font-light text-black hover:text-[#cf172f] transition-colors duration-200 truncate"
                    >
                      {subcategory.label}
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="h-[181px] w-px bg-[#e6e6e6] shrink-0" aria-hidden />

            <div className="shrink-0" dir={isRTL ? "rtl" : "ltr"}>
              {productsLoading ? (
                <div className="w-[152px] h-[181px] bg-gray-50 border border-[#e6e6e6] rounded-[6px] flex items-center justify-center">
                  <div className="text-sm text-black/50 px-2 text-center">{t("buttons.loading")}</div>
                </div>
              ) : featuredProduct ? (
                (() => {
                  const fp = featuredProduct as typeof featuredProduct & {
                    secondaryImage?: string | null;
                  };
                  const productPath = buildProductPath(featuredProduct);
                  const productName =
                    getLocalizedTranslation(featuredProduct.translations)?.name ??
                    featuredProduct.translations?.[0]?.name ??
                    t("whatsapp.product");
                  const price = convertedPrice ?? featuredProduct.price;

                  const content = (
                    <>
                      <div className="h-[119px] w-full bg-gray-50 overflow-hidden">
                        <img
                          loading="lazy"
                          src={fp.secondaryImage || featuredProduct.mainImage || ""}
                          alt={productName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      <div className="flex flex-col gap-1 px-3 py-2 flex-1 justify-center min-h-0">
                        <h4 className="text-sm font-semibold text-black leading-snug line-clamp-2 group-hover:text-[#cf172f] transition-colors">
                          {productName}
                        </h4>
                        <p className="text-sm text-black/50">
                          {selectedCurrency} {price.toFixed(2)}
                        </p>
                      </div>
                    </>
                  );

                  return productPath ? (
                    <Link
                      to={productPath}
                      className="bg-white border border-[#e6e6e6] rounded-[6px] w-[152px] h-[181px] flex flex-col overflow-hidden hover:shadow-md hover:border-[#cf172f]/20 transition-all duration-200 group"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      className="bg-white border border-[#e6e6e6] rounded-[6px] w-[152px] h-[181px] flex flex-col overflow-hidden opacity-60 cursor-not-allowed"
                      aria-disabled="true"
                    >
                      {content}
                    </div>
                  );
                })()
              ) : (
                <div className="w-[152px] h-[181px] bg-gray-50 border border-[#e6e6e6] rounded-[6px] flex items-center justify-center px-2 text-center">
                  <div className="text-sm text-black/50">{t("nav.carPartsHoverNoProduct")}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
