import { useState, useEffect, useMemo } from "react";
import { Link, href, useRouteLoaderData } from "react-router";
import { Loader2 } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { useQuery } from "@tanstack/react-query";
import { getApiProductsPublic } from "~/lib/client";
import { defaultParams } from "~/lib/api-client";
import { getCurrentLanguageId, LANGUAGE_IDS } from "~/lib/constants";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import type { Route } from "../routes/+types/_main";
import { buildProductPath } from "~/lib/product-url";
import { useCurrency } from "~/hooks/use-currency";
import { useTranslation } from "react-i18next";

const CARE_SLUG = "car-care-accessiores";

const SUGGESTION_POOL = 40;
const SUGGESTED_COUNT = 5;

const EMPTY_PRODUCTS: never[] = [];

function pickRandomDistinct<T>(items: T[], count: number): T[] {
  if (items.length <= count) return [...items];
  const idxs = new Set<number>();
  while (idxs.size < count) {
    idxs.add(Math.floor(Math.random() * items.length));
  }
  return [...idxs].map((i) => items[i]!);
}

function resolveCarCareProductType(
  productTypes: NonNullable<Route.ComponentProps["loaderData"]["productTypes"]>
) {
  return productTypes.find(
    (pt) =>
      pt.slug === CARE_SLUG ||
      (pt as { code?: string }).code === "car_care_accessiores" ||
      (pt as { code?: string }).code === "car-care-accessiores"
  );
}

const SHOP_PRODUCT_TYPE = "car-care-accessiores" as const;

/**
 * CarCareHoverPopup — matches RecommendedHoverPopup layout (header, view all, rows, loading/empty).
 */
export function CarCareHoverPopup({ children }: { children: React.ReactNode }) {
  const { i18n, t } = useTranslation("common");
  const isRTL = (i18n.language || "").startsWith("ar");
  const [open, setOpen] = useState(false);
  const [pickRefreshKey, setPickRefreshKey] = useState(0);

  const loaderData = useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const productTypes = loaderData?.productTypes ?? [];
  const carCareType = useMemo(() => resolveCarCareProductType(productTypes), [productTypes]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setPickRefreshKey((k) => k + 1);
  };

  const productsQuery = useQuery({
    queryKey: ["products", "hover", "car-care", carCareType?.id, getCurrentLanguageId()],
    queryFn: async () => {
      if (!carCareType) return [];
      const fetchList = async (languageId: string) => {
        const response = await getApiProductsPublic({
          query: {
            storeId: defaultParams.storeId,
            languageId,
            productTypeId: carCareType.id,
            limit: SUGGESTION_POOL,
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
    enabled: open && !!carCareType,
    staleTime: 60_000,
  });

  const suggestedProducts = useMemo(() => {
    const list = productsQuery.data ?? EMPTY_PRODUCTS;
    if (!list.length) return [];
    return pickRandomDistinct(list, SUGGESTED_COUNT);
  }, [productsQuery.data, productsQuery.dataUpdatedAt, pickRefreshKey]);

  const productsLoading = open && !!carCareType && productsQuery.isPending;

  const { selectedCurrency, convertPrice } = useCurrency();
  const [convertedPrices, setConvertedPrices] = useState<Record<string, number>>({});

  const strings = {
    picks: (n: number) =>
      isRTL
        ? `${n} منتج${n === 1 ? "" : "ات"}`
        : `${n} pick${n === 1 ? "" : "s"}`,
    loading: isRTL ? "جاري التحميل…" : "Loading…",
    noProducts: isRTL ? "لا توجد منتجات بعد" : "No products yet",
    noProductsDesc: isRTL
      ? "عد لاحقًا — نضيف منتجات جديدة باستمرار."
      : "Check back soon — we're always adding new products.",
    noTypeTitle: isRTL ? "تعذر تحميل التصنيف" : "Category unavailable",
    noTypeDesc: isRTL
      ? "افتح المتجر للعثور على منتجات العناية بالسيارة."
      : "Open the shop to browse car care products.",
  };

  useEffect(() => {
    if (!open) {
      setConvertedPrices((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    if (!suggestedProducts.length) {
      setConvertedPrices((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    let cancelled = false;
    (async () => {
      const conv: Record<string, number> = {};
      for (const p of suggestedProducts) {
        const r = await convertPrice(p.price, "JOD");
        conv[p.id] = r.convertedAmount;
      }
      if (!cancelled) setConvertedPrices(conv);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, suggestedProducts, selectedCurrency]);

  const shopCareRoot = href("/shop/:productType", { productType: SHOP_PRODUCT_TYPE });

  const renderProductRow = (item: (typeof suggestedProducts)[number]) => {
    const translation = getLocalizedTranslation(item.translations);
    const name = translation?.name ?? item.translations?.[0]?.name ?? "";
    const price = convertedPrices[item.id] ?? item.price;
    const productPath = buildProductPath(item);
    const itemClass =
      "group flex items-center gap-3 rounded-[6px] border border-[#e6e6e6] bg-white px-3 py-2 hover:border-[#cf172f] hover:bg-[#fff5f6] transition-colors";

    const inner = (
      <>
        <img
          src={item.mainImage ?? "/car-placeholder.png"}
          alt={name}
          className="h-12 w-12 object-contain shrink-0"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-black truncate group-hover:text-[#cf172f] transition-colors">
            {name}
          </p>
          <p className="text-sm text-black/50">
            {selectedCurrency} {price.toFixed(2)}
          </p>
        </div>
      </>
    );

    return productPath ? (
      <Link key={item.id} to={productPath} className={itemClass}>
        {inner}
      </Link>
    ) : (
      <div
        key={item.id}
        className="flex items-center gap-3 rounded-[6px] border border-[#e6e6e6] bg-white px-3 py-2 opacity-60"
      >
        {inner}
      </div>
    );
  };

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        <span className="inline-flex">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent
        className="hidden md:block w-[400px] p-4 bg-[#f2f2f2] border border-[#e6e6e6] rounded-[2px] shadow-[0_4px_10px_0_rgba(0,0,0,0.10)] z-50"
        sideOffset={12}
        align="center"
      >
        <div className="w-full font-sans" dir={isRTL ? "rtl" : "ltr"}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-black">{t("nav.carCareAccessories")}</h3>
              <p className="text-sm text-black/50">
                {carCareType && suggestedProducts.length > 0
                  ? strings.picks(suggestedProducts.length)
                  : ""}
              </p>
            </div>
            <Link
              to={shopCareRoot}
              className="text-sm text-black/50 hover:text-black underline shrink-0"
            >
              {t("buttons.viewAll")}
            </Link>
          </div>

          {!carCareType ? (
            <div className="rounded-[6px] border border-[#e6e6e6] bg-white p-4">
              <p className="text-sm font-semibold text-black">{strings.noTypeTitle}</p>
              <p className="text-sm text-black/50 mt-1">{strings.noTypeDesc}</p>
              <div className="mt-3">
                <Link to={shopCareRoot} className="text-sm text-[#cf172f] underline">
                  {t("nav.carCareAccessories")}
                </Link>
              </div>
            </div>
          ) : productsLoading ? (
            <div className="flex items-center justify-center py-8 text-black/50">
              <Loader2 className="size-5 animate-spin me-2" />
              <span className="text-sm">{strings.loading}</span>
            </div>
          ) : suggestedProducts.length === 0 ? (
            <div className="rounded-[6px] border border-[#e6e6e6] bg-white p-4">
              <p className="text-sm font-semibold text-black">{strings.noProducts}</p>
              <p className="text-sm text-black/50 mt-1">{strings.noProductsDesc}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestedProducts.map((item) => renderProductRow(item))}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
