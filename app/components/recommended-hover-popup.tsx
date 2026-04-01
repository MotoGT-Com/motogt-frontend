import { useState, useEffect, useMemo } from "react";
import { Link, href, useRouteLoaderData } from "react-router";
import { Loader2, Sparkles } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { useQuery } from "@tanstack/react-query";
import { garageCarsQueryOptions } from "~/lib/queries";
import { getApiProductsPublic } from "~/lib/client/sdk.gen";
import { defaultParams } from "~/lib/api-client";
import { getCurrentLanguageId } from "~/lib/constants";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import { buildProductPath } from "~/lib/product-url";
import { useCurrency } from "~/hooks/use-currency";
import { useTranslation } from "react-i18next";
import { getGuestGarage } from "~/lib/guest-garage-manager";
import { AddNewCarDialog } from "~/components/add-new-car-dialog";
import type { Route } from "../routes/+types/_main";

const CAR_PREVIEW_LIMIT = 3;
const CARE_SLUG = "car-care-accessiores";
const CLEANING_FETCH_LIMIT = 24;
const CLEANING_PICKS = 2;

/** Stable fallback so `?? []` does not allocate a new array every render (infinite useEffect loop). */
const EMPTY_PRODUCTS: never[] = [];

function pickRandomDistinct<T>(items: T[], count: number): T[] {
  if (items.length <= count) return [...items];
  const idxs = new Set<number>();
  while (idxs.size < count) {
    idxs.add(Math.floor(Math.random() * items.length));
  }
  return [...idxs].map((i) => items[i]!);
}

export function RecommendedHoverPopup({ children }: { children: React.ReactNode }) {
  const { i18n, t } = useTranslation("common");
  const isRTL = (i18n.language || "").startsWith("ar");
  const loaderData = useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const isAuthenticated = !!loaderData?.isAuthenticated;
  const [open, setOpen] = useState(false);
  const [cleaningRefreshKey, setCleaningRefreshKey] = useState(0);

  const careProductTypeId = useMemo(() => {
    const types = loaderData?.productTypes ?? [];
    const match = types.find(
      (pt) => pt.slug === CARE_SLUG || (pt as { code?: string }).code === "car_care_accessiores"
    );
    return match?.id ?? null;
  }, [loaderData?.productTypes]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setCleaningRefreshKey((k) => k + 1);
  };
  const { selectedCurrency, convertPrice } = useCurrency();
  const [convertedPrices, setConvertedPrices] = useState<Record<string, number>>({});

  const garageQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated && open,
  });

  const previewCarId = useMemo(() => {
    if (!open) return null;
    if (isAuthenticated) {
      const data = garageQuery.data;
      if (!data) return null;
      return (
        data.summary?.primaryCar?.carId ??
        data.userCars?.[0]?.carId ??
        null
      );
    }
    const guest = getGuestGarage();
    return guest[0]?.carId ?? null;
  }, [open, isAuthenticated, garageQuery.data]);

  const previewQuery = useQuery({
    queryKey: ["recommended-preview", previewCarId, getCurrentLanguageId()],
    queryFn: async () => {
      if (!previewCarId) return [];
      const response = await getApiProductsPublic({
        query: {
          storeId: defaultParams.storeId,
          languageId: getCurrentLanguageId(),
          carId: previewCarId,
          limit: CAR_PREVIEW_LIMIT,
          page: 1,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      });
      if (response.error) throw response.error;
      return response.data?.data ?? [];
    },
    enabled: open && !!previewCarId,
    staleTime: 60_000,
  });

  const cleaningQuery = useQuery({
    queryKey: [
      "recommended-hover-cleaning",
      careProductTypeId,
      getCurrentLanguageId(),
      cleaningRefreshKey,
    ],
    queryFn: async () => {
      if (!careProductTypeId) return [];
      const response = await getApiProductsPublic({
        query: {
          storeId: defaultParams.storeId,
          languageId: getCurrentLanguageId(),
          productTypeId: careProductTypeId,
          limit: CLEANING_FETCH_LIMIT,
          page: 1,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      });
      if (response.error) throw response.error;
      const all = response.data?.data ?? [];
      return pickRandomDistinct(all, CLEANING_PICKS);
    },
    enabled: open && !!careProductTypeId && !!previewCarId,
    staleTime: 0,
  });

  const carProducts = previewQuery.data ?? EMPTY_PRODUCTS;
  const cleaningProductsRaw = cleaningQuery.data ?? EMPTY_PRODUCTS;

  const combinedProducts = useMemo(() => {
    const cars = carProducts.slice(0, CAR_PREVIEW_LIMIT);
    const carIds = new Set(cars.map((p) => p.id));
    const cleaning = cleaningProductsRaw.filter((p) => !carIds.has(p.id)).slice(0, CLEANING_PICKS);
    return [...cars, ...cleaning];
  }, [carProducts, cleaningProductsRaw]);

  const garageLoading = isAuthenticated && open && garageQuery.isPending;

  const recommendationsLoading =
    !!previewCarId &&
    (previewQuery.isPending ||
      (!!careProductTypeId && cleaningQuery.isPending));

  // convertPrice intentionally omitted from deps (stable useCallback on provider)
  useEffect(() => {
    if (!open) {
      setConvertedPrices((prev) =>
        Object.keys(prev).length === 0 ? prev : {}
      );
      return;
    }
    const car = previewQuery.data;
    const clean = cleaningQuery.data;
    const cars = (car ?? EMPTY_PRODUCTS).slice(0, CAR_PREVIEW_LIMIT);
    const carIds = new Set(cars.map((p) => p.id));
    const cleaning = (clean ?? EMPTY_PRODUCTS)
      .filter((p) => !carIds.has(p.id))
      .slice(0, CLEANING_PICKS);
    const list = [...cars, ...cleaning];
    if (!list.length) {
      setConvertedPrices((prev) =>
        Object.keys(prev).length === 0 ? prev : {}
      );
      return;
    }
    let cancelled = false;
    (async () => {
      const conv: Record<string, number> = {};
      for (const p of list) {
        const r = await convertPrice(p.price, "JOD");
        conv[p.id] = r.convertedAmount;
      }
      if (!cancelled) setConvertedPrices(conv);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    previewQuery.data,
    previewQuery.dataUpdatedAt,
    cleaningQuery.data,
    cleaningQuery.dataUpdatedAt,
    selectedCurrency,
  ]);

  const strings = {
    subtitle: isRTL ? "مبنية على سيارتك" : "Based on your garage",
    viewAll: isRTL ? "عرض التوصيات" : "View all recommendations",
    emptyTitle: isRTL ? "أضف سيارة للتوصيات" : "Add a car for recommendations",
    emptyDesc: isRTL
      ? "احفظ سيارتك في الكراج لنعرض لك قطعًا ومنتجات مناسبة."
      : "Save your car in My Garage to see parts and products matched to your vehicle.",
    noProducts: isRTL ? "لا توجد توصيات بعد" : "No recommendations yet",
    noProductsDesc: isRTL
      ? "عد لاحقًا — نضيف منتجات جديدة باستمرار."
      : "Check back soon — we're always adding new products.",
    loading: isRTL ? "جاري التحميل…" : "Loading…",
    picks: (n: number) =>
      isRTL
        ? `${n} منتج${n === 1 ? "" : "ات"}`
        : `${n} pick${n === 1 ? "" : "s"}`,
  };

  const renderProductRow = (item: (typeof combinedProducts)[number]) => {
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
              <h3 className="text-sm font-semibold text-black">
                {t("nav.recommendedForYou")}
              </h3>
              <p className="text-sm text-black/50">
                {previewCarId && combinedProducts.length > 0
                  ? strings.picks(combinedProducts.length)
                  : previewCarId
                    ? strings.subtitle
                    : ""}
              </p>
            </div>
            <Link
              to={href("/recommended")}
              className="text-sm text-black/50 hover:text-black underline shrink-0"
            >
              {strings.viewAll}
            </Link>
          </div>

          {garageLoading ? (
            <div className="flex items-center justify-center py-8 text-black/50">
              <Loader2 className="size-5 animate-spin me-2" />
              <span className="text-sm">{strings.loading}</span>
            </div>
          ) : !previewCarId ? (
            <div className="rounded-[6px] border border-[#e6e6e6] bg-white p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="size-8 text-[#cf172f] shrink-0" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-black">{strings.emptyTitle}</p>
                  <p className="text-sm text-black/50">{strings.emptyDesc}</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <AddNewCarDialog />
              </div>
            </div>
          ) : recommendationsLoading ? (
            <div className="flex items-center justify-center py-8 text-black/50">
              <Loader2 className="size-5 animate-spin me-2" />
              <span className="text-sm">{strings.loading}</span>
            </div>
          ) : combinedProducts.length === 0 ? (
            <div className="rounded-[6px] border border-[#e6e6e6] bg-white p-4">
              <p className="text-sm font-semibold text-black">{strings.noProducts}</p>
              <p className="text-sm text-black/50 mt-1">{strings.noProductsDesc}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {combinedProducts.map((item) => renderProductRow(item))}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
