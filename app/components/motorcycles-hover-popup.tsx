import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { useQuery } from "@tanstack/react-query";
import { Link, href, useRouteLoaderData } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getApiCategoriesPublic, getApiProductsPublic } from "~/lib/client";
import { defaultParams } from "~/lib/api-client";
import { getCurrentLanguageId, LANGUAGE_IDS } from "~/lib/constants";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import type { Route } from "../routes/+types/_main";
import { buildProductPath } from "~/lib/product-url";
import { useCurrency } from "~/hooks/use-currency";

const PARENT_CATEGORY_PAGE_LIMIT = 100;
const MAX_CATEGORY_PAGES = 10;
const FEATURED_POOL = 20;

type CategoryRow = {
  id: string;
  sortOrder?: number;
  translations?: Array<{ languageCode: string; name: string }>;
  subcategories?: Array<{
    id: string;
    name: string;
    sortOrder: number;
    translations?: Array<{ languageCode: string; name: string }>;
  }>;
};

function categoryLabel(row: CategoryRow, fallback: string): string {
  const tr = row.translations;
  if (tr?.length) {
    const picked = getLocalizedTranslation(tr);
    if (picked?.name) return picked.name;
  }
  return fallback;
}

function subcategoryLabel(
  sub: NonNullable<CategoryRow["subcategories"]>[number],
  fallback: string
): string {
  const tr = sub.translations;
  if (tr?.length) {
    const picked = getLocalizedTranslation(tr);
    if (picked?.name) return picked.name;
  }
  if (sub.name) return sub.name;
  return fallback;
}

/** All subcategories in display order; parents with no children use the parent row (shop accepts either id). */
function flattenSubcategoryLinks(categories: CategoryRow[], fallback: string): { id: string; label: string }[] {
  const rows: { id: string; label: string; sortKey: number }[] = [];
  const parents = [...categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  for (const cat of parents) {
    const subs = [...(cat.subcategories ?? [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
    const parentKey = (cat.sortOrder ?? 0) * 10_000;
    if (subs.length > 0) {
      for (let i = 0; i < subs.length; i++) {
        const sub = subs[i]!;
        rows.push({
          id: sub.id,
          label: subcategoryLabel(sub, fallback),
          sortKey: parentKey + (sub.sortOrder ?? 0) + i * 0.001,
        });
      }
    } else {
      rows.push({
        id: cat.id,
        label: categoryLabel(cat, fallback),
        sortKey: parentKey,
      });
    }
  }
  rows.sort((a, b) => a.sortKey - b.sortKey);
  return rows.map(({ id, label }) => ({ id, label }));
}

function resolveMotorcyclesProductType(
  productTypes: NonNullable<Route.ComponentProps["loaderData"]["productTypes"]>
) {
  return productTypes.find((pt) => pt.slug === "motorcycles" || pt.code === "motorcycles");
}

/**
 * MotorcyclesHoverPopup — desktop hover on Motorcycles nav: categories + one featured product.
 * Row layout is direction:ltr so RTL keeps the product card on the correct side (same as car parts).
 */
export function MotorcyclesHoverPopup({ children }: { children: React.ReactNode }) {
  const { i18n, t } = useTranslation("common");
  const loaderData = useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const productTypes = loaderData?.productTypes ?? [];
  const motorcyclesType = useMemo(() => resolveMotorcyclesProductType(productTypes), [productTypes]);

  const categoriesQuery = useQuery({
    queryKey: ["categories", "hover", "motorcycles", motorcyclesType?.id, getCurrentLanguageId()],
    queryFn: async () => {
      if (!motorcyclesType) return [];
      const all: CategoryRow[] = [];
      for (let page = 1; page <= MAX_CATEGORY_PAGES; page++) {
        const response = await getApiCategoriesPublic({
          query: {
            storeId: defaultParams.storeId,
            languageId: getCurrentLanguageId(),
            productTypeId: motorcyclesType.id,
            includeSubcategories: true,
            limit: PARENT_CATEGORY_PAGE_LIMIT,
            page,
            sortBy: "sortOrder",
            sortOrder: "asc",
          },
        });
        if (response.error) throw response.error;
        const batch = (response.data?.data ?? []) as CategoryRow[];
        all.push(...batch);
        const meta = response.data?.meta;
        if (!meta?.hasNext || batch.length === 0) break;
      }
      return all;
    },
    enabled: !!motorcyclesType,
  });

  const productsQuery = useQuery({
    queryKey: ["products", "hover", "motorcycles", motorcyclesType?.id, getCurrentLanguageId()],
    queryFn: async () => {
      if (!motorcyclesType) return [];
      const fetchList = async (languageId: string) => {
        const response = await getApiProductsPublic({
          query: {
            storeId: defaultParams.storeId,
            languageId,
            productTypeId: motorcyclesType.id,
            limit: FEATURED_POOL,
            page: 1,
            sortBy: "createdAt",
            sortOrder: "desc",
          } as any,
        });
        if (response.error) throw response.error;
        return response.data?.data ?? [];
      };
      const lang = getCurrentLanguageId();
      let list = await fetchList(lang);
      if (list.length === 0 && lang !== LANGUAGE_IDS.en) {
        list = await fetchList(LANGUAGE_IDS.en);
      }
      return list;
    },
    enabled: !!motorcyclesType,
  });

  const categoryFallback = t("nav.motorcyclesHoverCategoryFallback");
  const subcategoryLinks = useMemo(() => {
    const raw = categoriesQuery.data ?? [];
    return flattenSubcategoryLinks(raw as CategoryRow[], categoryFallback);
  }, [categoriesQuery.data, categoryFallback]);

  const midpoint = Math.ceil(subcategoryLinks.length / 2);
  const leftColumn = subcategoryLinks.slice(0, midpoint);
  const rightColumn = subcategoryLinks.slice(midpoint);

  const featuredProduct = useMemo(() => {
    const list = productsQuery.data;
    if (!list?.length) return null;
    const i = Math.floor(Math.random() * list.length);
    return list[i] ?? null;
  }, [productsQuery.data]);

  const categoriesLoading = !!motorcyclesType && categoriesQuery.isPending;
  const productsLoading = !!motorcyclesType && productsQuery.isPending;

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

  const isRTL = (i18n.language || "").startsWith("ar");

  const shopMotorcyclesHref = (categoryId: string) =>
    `${href("/shop/:productType", { productType: "motorcycles" })}?categories=${encodeURIComponent(categoryId)}`;

  const shopMotorcyclesRoot = href("/shop/:productType", { productType: "motorcycles" });

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
          <h3 className="text-sm font-semibold text-black">{t("nav.motorcyclesHoverTitle")}</h3>

          <div className="flex flex-row items-stretch gap-6 min-w-0" dir="ltr">
            <div className="flex gap-8 flex-1 min-w-0" dir={isRTL ? "rtl" : "ltr"}>
              {!motorcyclesType ? (
                <p className="text-sm text-black/50 py-2">
                  <Link to={shopMotorcyclesRoot} className="underline hover:text-[#cf172f]">
                    {t("nav.motorcycles")}
                  </Link>
                </p>
              ) : categoriesLoading ? (
                <div className="text-sm text-black/50 py-2">{t("buttons.loading")}</div>
              ) : subcategoryLinks.length === 0 ? (
                <div className="text-sm text-black/50 py-2 max-w-[220px]">
                  <Link to={shopMotorcyclesRoot} className="underline hover:text-[#cf172f]">
                    {t("nav.motorcyclesHoverNoCategories")}
                  </Link>
                </div>
              ) : (
                <div className="flex gap-8 flex-1 min-w-0 min-h-[181px] max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain pe-1">
                  <div className="flex flex-col space-y-3 min-w-0 flex-1">
                    {leftColumn.map((row) => (
                      <Link
                        key={row.id}
                        to={shopMotorcyclesHref(row.id)}
                        className="text-sm font-light text-black hover:text-[#cf172f] transition-colors duration-200 truncate shrink-0"
                      >
                        {row.label}
                      </Link>
                    ))}
                  </div>
                  <div className="flex flex-col space-y-3 min-w-0 flex-1">
                    {rightColumn.map((row) => (
                      <Link
                        key={row.id}
                        to={shopMotorcyclesHref(row.id)}
                        className="text-sm font-light text-black hover:text-[#cf172f] transition-colors duration-200 truncate shrink-0"
                      >
                        {row.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="w-px bg-[#e6e6e6] shrink-0 self-stretch min-h-[181px]"
              aria-hidden
            />

            <div className="shrink-0" dir={isRTL ? "rtl" : "ltr"}>
              {!motorcyclesType ? (
                <div className="w-[152px] h-[181px] bg-gray-50 border border-[#e6e6e6] rounded-[6px] flex items-center justify-center px-2 text-center">
                  <div className="text-sm text-black/50">{t("nav.motorcyclesHoverNoProduct")}</div>
                </div>
              ) : productsLoading ? (
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
                  <div className="text-sm text-black/50">{t("nav.motorcyclesHoverNoProduct")}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
