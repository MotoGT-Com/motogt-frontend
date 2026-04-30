import { useEffect, useMemo, useState } from "react";
import { Link, useRouteLoaderData } from "react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Heart, Loader2 } from "lucide-react";
import { garageFeaturedProductsQueryOptions } from "~/lib/queries";
import { buildProductPath } from "~/lib/product-url";
import { getApiProductsPublic } from "~/lib/client";
import { defaultParams } from "~/lib/api-client";
import { config } from "~/config";
import { resolveProductSlug } from "~/lib/get-locale-translation";
import type { UserCarsResponse, ProductItem } from "~/lib/client/types.gen";
import { useCartManager } from "~/lib/cart-manager";
import { useFavoritesManager } from "~/lib/favorites-manager";
import { useCurrency } from "~/hooks/use-currency";
import type { Route } from "../routes/+types/_main";
import { SUPPORTED_CURRENCIES, type Currency } from "~/lib/constants";

type UserCar = UserCarsResponse["data"]["userCars"][number];
type Props = { userCars: UserCar[] };

const INTERVAL = 5000;
const MAX_FEATURED_PRODUCTS = 5;

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}


function toCurrencyCode(value: string): Currency {
  const upper = (value || "JOD").toUpperCase();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(upper)
    ? (upper as Currency)
    : "JOD";
}

function SlidePrice({ price, currency: productCurrency }: { price: number; currency: string }) {
  const { selectedCurrency, convertPrice } = useCurrency();
  const [displayPrice, setDisplayPrice] = useState<number>(price);
  useEffect(() => {
    const from = toCurrencyCode(productCurrency);
    if (selectedCurrency === from) { setDisplayPrice(price); return; }
    convertPrice(price, from)
      .then(r => setDisplayPrice(r.convertedAmount))
      .catch(() => setDisplayPrice(price));
  }, [price, selectedCurrency, productCurrency, convertPrice]);
  return (
    <span className="text-white font-bold text-base sm:text-lg md:text-2xl mt-2 md:mt-3">
      {selectedCurrency} {displayPrice.toFixed(2)}
    </span>
  );
}

function BannerProductCard({ product, name }: { product: ProductItem; name: string }) {
  const { t } = useTranslation("garage");
  const { t: tCommon } = useTranslation("common");
  const loaderData = useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const { addToCartMutation } = useCartManager(loaderData?.isAuthenticated);
  const { toggleFavoritesMutation, favoritesQuery } = useFavoritesManager(loaderData?.isAuthenticated);
  const path = buildProductPath(product);
  const isFavorite = favoritesQuery.data?.items.some((item: any) => item.id === product.id) ?? product.in_favs ?? false;
  const image = product.mainImage ?? product.images?.[0] ?? "";

  return (
    <div className="relative flex h-[170px] flex-col overflow-hidden rounded-md bg-white shadow-xl md:h-auto w-[200px] md:w-[240px]">
      {/* Clickable overlay covering the whole card */}
      <Link to={path} className="absolute inset-0 z-10" aria-label={name} />

      {/* Image — flex-1 fills space above actions on mobile (170px total card); fixed height on md+ */}
      <div className="flex min-h-0 flex-1 items-center justify-center bg-white px-2 pt-2 md:h-[180px] md:flex-none md:px-3 md:pt-3">
        <img src={image} alt={name} loading="lazy" className="h-full w-auto max-w-full object-contain" />
      </div>

      {/* Bottom section */}
      <div className="flex flex-shrink-0 flex-col gap-1.5 px-2 py-2 md:gap-2.5 md:px-3 md:py-3">
        {/* Add to cart + wishlist in same row */}
        <div className="relative z-20 flex items-center gap-1.5">
          <button
            onClick={() => addToCartMutation.mutate({
              productId: product.id,
              itemCode: product.itemCode,
              productTranslations: product.translations.map(t => ({ name: t.name, slug: t.slug, languageCode: t.languageCode })),
              productImage: product.mainImage || "",
              unitPrice: product.price,
              quantity: 1,
            })}
            disabled={addToCartMutation.isPending || product.stockQuantity <= 0}
            className="flex-1 bg-[#CF172F] disabled:opacity-50 text-white text-[10px] font-koulen font-black uppercase tracking-widest py-1.5 md:py-2 rounded-sm hover:bg-[#b01228] transition-colors flex items-center justify-center gap-1"
          >
            {addToCartMutation.isPending
              ? <><Loader2 className="w-3 h-3 animate-spin" /> {t("featuredBanner.addingToCart")}</>
              : product.stockQuantity <= 0 ? tCommon("status.outOfStock") : tCommon("buttons.addToCart")}
          </button>
          <button
            onClick={() => toggleFavoritesMutation.mutate({ ...product, isFavorite: isFavorite ?? false })}
            className="p-1.5 rounded-sm border border-gray-200 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label={t("featuredBanner.toggleFavorite")}
          >
            <Heart className="w-3 h-3 md:w-4 md:h-4" fill={isFavorite ? "#CF172F" : "none"} stroke={isFavorite ? "#CF172F" : "#6b7280"} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function GarageFeaturedBanner({ userCars }: Props) {
  const { t, i18n } = useTranslation("garage");
  const isRtl   = i18n.dir(i18n.language) === "rtl";
  const lang     = (i18n.language || "").split("-")[0];
  const featuredCars = useMemo(
    () =>
      Array.from(
        new Map(
          (userCars ?? [])
            .map((car) => ({
              brand: car.carDetails.brand,
              model: car.carDetails.model,
            }))
            .filter((car) => car.brand && car.model)
            .map((car) => [
              `${car.brand.toLowerCase()}|${car.model.toLowerCase()}`,
              car,
            ])
        ).values()
      ),
    [userCars]
  );

  const featuredQueries = useQueries({
    queries: featuredCars.map((car) =>
      garageFeaturedProductsQueryOptions(car.brand, car.model)
    ),
  });
  const randomProductsQuery = useQuery<ProductItem[]>({
    queryKey: ["homeFeaturedRandomProducts", lang],
    enabled: featuredCars.length === 0,
    queryFn: async () => {
      const languageId = lang === "ar" ? config.languageIds.ar : config.languageIds.en;
      const response = await getApiProductsPublic({
        query: {
          storeId: defaultParams.storeId,
          languageId,
          page: 1,
          limit: 30,
          sortBy: "createdAt",
          sortOrder: "desc",
        } as any,
      });

      if (response.error) {
        throw new Error(response.error.error?.message || "Failed to fetch random featured products");
      }

      let randomPool = (response.data?.data ?? []) as ProductItem[];

      if (lang === "ar" && randomPool.length > 0) {
        const englishResponse = await getApiProductsPublic({
          query: {
            storeId: defaultParams.storeId,
            languageId: config.languageIds.en,
            productIds: randomPool.map((product) => product.id).join(","),
          },
        });

        const englishSlugById = new Map<string, string>();
        for (const product of englishResponse.data?.data ?? []) {
          const slug = resolveProductSlug(product, {
            preferEnglish: true,
            language: "en",
          });
          if (slug) englishSlugById.set(product.id, slug);
        }

        randomPool = randomPool.map((product) => ({
          ...product,
          slug_en: englishSlugById.get(product.id) ?? product.slug_en ?? null,
        }));
      }

      return shuffleArray(randomPool).slice(0, MAX_FEATURED_PRODUCTS);
    },
    staleTime: 1000 * 60 * 5,
  });

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [sourceByProductId, setSourceByProductId] = useState<
    Map<string, { brand: string; model: string }>
  >(new Map());

  const selectionDataKey = featuredQueries
    .map((query) => `${query.dataUpdatedAt}:${query.data?.data?.length ?? 0}`)
    .join("|");

  useEffect(() => {
    if (featuredCars.length === 0) {
      const randomProducts = randomProductsQuery.data ?? [];
      setProducts(randomProducts.slice(0, MAX_FEATURED_PRODUCTS));
      setSourceByProductId(new Map());
      return;
    }

    const sourceMap = new Map<string, { brand: string; model: string }>();
    const selectedProducts: ProductItem[] = [];
    const seen = new Set<string>();

    const pools = featuredCars.map((car, index) => ({
      car,
      products: shuffleArray(
        ((featuredQueries[index]?.data?.data ?? []) as ProductItem[]).filter(
          (product) => !!product?.id
        )
      ),
    }));

    // First pass: try to pick one unique product per car for diversity.
    for (const pool of shuffleArray(pools)) {
      const candidate = pool.products.find(
        (product) => !!product.id && !seen.has(product.id)
      );
      if (!candidate?.id) continue;
      seen.add(candidate.id);
      selectedProducts.push(candidate);
      sourceMap.set(candidate.id, pool.car);
      if (selectedProducts.length >= MAX_FEATURED_PRODUCTS) break;
    }

    // Second pass: fill remaining slots with random unique products from all cars.
    if (selectedProducts.length < MAX_FEATURED_PRODUCTS) {
      const remaining = shuffleArray(
        pools.flatMap((pool) =>
          pool.products
            .filter((product) => !!product.id && !seen.has(product.id))
            .map((product) => ({ product, car: pool.car }))
        )
      );

      for (const entry of remaining) {
        if (!entry.product.id || seen.has(entry.product.id)) continue;
        seen.add(entry.product.id);
        selectedProducts.push(entry.product);
        sourceMap.set(entry.product.id, entry.car);
        if (selectedProducts.length >= MAX_FEATURED_PRODUCTS) break;
      }
    }

    setProducts(selectedProducts.slice(0, MAX_FEATURED_PRODUCTS));
    setSourceByProductId(sourceMap);
  }, [featuredCars, selectionDataKey, randomProductsQuery.dataUpdatedAt]);

  const count = products.length;
  const fallbackCar = featuredCars[0];

  const [activeIndex, setActiveIndex] = useState(0);
  const [progressKey, setProgressKey] = useState(0); // restarts CSS animation
  const [navKey,      setNavKey]      = useState(0); // restarts interval after manual nav

  /* ─── single autoplay effect ─────────────────────────────────── */
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % count);
      setProgressKey(k => k + 1);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [count, navKey]); // navKey causes restart after manual nav

  useEffect(() => {
    if (count === 0) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex >= count) {
      setActiveIndex(0);
    }
  }, [count, activeIndex]);

  /* ─── reset on car change ────────────────────────────────────── */
  const carSignature = featuredCars
    .map((car) => `${car.brand}|${car.model}`)
    .join(",");

  useEffect(() => {
    setActiveIndex(0);
    setProgressKey(k => k + 1);
    setNavKey(k => k + 1);
  }, [carSignature]);

  /* ─── navigation helpers ─────────────────────────────────────── */
  const goTo = (i: number) => {
    if (count === 0) return;
    const normalized = ((i % count) + count) % count;
    setActiveIndex(normalized);
    setProgressKey(k => k + 1);
    setNavKey(k => k + 1);
  };
  const goPrev = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);

  /* ─── loading ────────────────────────────────────────────────── */
  const isLoadingGarageProducts =
    featuredCars.length > 0 &&
    featuredQueries.length > 0 &&
    featuredQueries.some((query) => query.isPending) &&
    count === 0;
  const isLoadingRandomProducts =
    featuredCars.length === 0 && randomProductsQuery.isPending && count === 0;

  if (isLoadingGarageProducts || isLoadingRandomProducts) {
    return (
      <div className="w-full min-h-[400px] md:min-h-0 md:h-[320px] relative overflow-hidden">
        <img
          src="/garage/garage-banner-1280w.webp"
          srcSet="/garage/garage-banner-768w.webp 768w, /garage/garage-banner-1280w.webp 1280w, /garage/garage-banner-1920w.webp 1920w, /garage/garage-banner-2560w.webp 2560w"
          sizes="100vw"
          alt=""
          aria-hidden
          width={5120}
          height={1339}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover md:object-center object-[center_22%]"
        />
        <div className="absolute inset-0 bg-white/10" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/45 animate-pulse" />
      </div>
    );
  }

  if (count === 0) return null;

  /* ─── render ─────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes fillBar {
          from { transform:scaleX(0); }
          to   { transform:scaleX(1); }
        }
      `}</style>

      <section
        className="group w-full relative overflow-hidden min-h-[400px] md:min-h-[320px]"
        dir={isRtl ? "rtl" : "ltr"}
        aria-label={
          fallbackCar
            ? t("featuredBanner.featuredFor", {
                brand: fallbackCar.brand,
                model: fallbackCar.model,
              })
            : t("featuredBanner.featuredProductsAria")
        }
      >
        {/* Fixed background — mobile is a taller vertical frame; desktop stays wide */}
        <img
          src="/garage/garage-banner-1280w.webp"
          srcSet="/garage/garage-banner-768w.webp 768w, /garage/garage-banner-1280w.webp 1280w, /garage/garage-banner-1920w.webp 1920w, /garage/garage-banner-2560w.webp 2560w"
          sizes="100vw"
          alt=""
          aria-hidden
          width={5120}
          height={1339}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover object-[center_22%] md:object-center"
        />
        <div className="absolute inset-0 bg-white/10" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/45" aria-hidden />

        {/* Slide stack */}
        <div className="relative min-h-[400px] md:min-h-[320px]">
          {products.map((product, i) => {
            const trs   = product.translations ?? [];
            const tr    = trs.find(x => x.languageCode?.toLowerCase().startsWith(lang)) ?? trs[0];
            const name  = tr?.name ?? "";
            const image = product.mainImage ?? product.images?.[0] ?? null;
            const path  = buildProductPath(product);
            const active = i === activeIndex;
            const source = sourceByProductId.get(product.id);
            const compatibility = product.carCompatibility?.find(
              (item) => item?.carBrand && item?.carModel
            );
            const carLabel = source
              ? `${source.brand} ${source.model}`
              : compatibility
                ? `${compatibility.carBrand} ${compatibility.carModel}`
                : fallbackCar
                  ? `${fallbackCar.brand} ${fallbackCar.model}`
                  : t("fitment.universal");

            return (
              <div
                key={`${product.id}-${i}`}
                className="absolute inset-0 transition-opacity duration-500 ease-in-out"
                style={{ opacity: active ? 1 : 0, pointerEvents: active ? "auto" : "none" }}
                aria-hidden={!active}
              >
                <div className="w-full h-full max-w-7xl mx-auto px-4 md:px-6 flex flex-col items-center justify-center gap-5 py-8 md:flex-row md:items-center md:gap-4 md:py-10">
                  {/* Text — centered on mobile (vertical stack), start-aligned on md+ */}
                  <div className="flex w-full flex-col justify-center min-w-0 text-center md:flex-1 md:text-start">
                    <p className="text-white/75 uppercase text-[10px] md:text-base font-semibold tracking-[0.2em] mb-2 md:mb-3 truncate">
                      {carLabel}
                    </p>
                    <h2 className="mx-auto w-full max-w-xl text-white uppercase font-black text-xl sm:text-2xl md:text-4xl md:mx-0 md:max-w-none leading-[0.95] break-words line-clamp-3 md:line-clamp-none">
                      {name}
                    </h2>
                    <SlidePrice price={product.price} currency={(product as any).currency || "JOD"} />
                  </div>

                  {/* Product card — below copy on mobile, side-by-side on md+ */}
                  <div className="flex w-full flex-shrink-0 items-center justify-center md:w-auto">
                    <BannerProductCard product={product} name={name} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Arrows */}
        {count > 1 && (
          <>
            <button type="button" onClick={isRtl ? goNext : goPrev} aria-label={t("featuredBanner.previousSlide")}
                    className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-9 md:h-9 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center transition-colors">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button type="button" onClick={isRtl ? goPrev : goNext} aria-label={t("featuredBanner.nextSlide")}
                    className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-9 md:h-9 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center transition-colors">
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </>
        )}

        {/* Progress dots */}
        {count > 1 && (
          <div className="absolute bottom-3 md:bottom-5 left-0 right-0 flex justify-center gap-2 z-20">
            {products.map((_, i) => (
              <button type="button" key={i} onClick={() => goTo(i)} aria-label={t("featuredBanner.productSlide", { index: i + 1 })}
                      className="w-8 md:w-10 h-[3px] rounded-full bg-white/30 overflow-hidden relative">
                {i === activeIndex && (
                  <span key={progressKey}
                        className="absolute inset-0 rounded-full bg-white origin-left"
                        style={{ animation: `fillBar ${INTERVAL}ms linear forwards` }} />
                )}
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
