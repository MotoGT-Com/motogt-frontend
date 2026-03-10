import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { garageFeaturedProductsQueryOptions } from "~/lib/queries";
import { buildProductPath } from "~/lib/product-url";
import { getApiProductsPublic } from "~/lib/client";
import { defaultParams } from "~/lib/api-client";
import { config } from "~/config";
import { resolveProductSlug } from "~/lib/get-locale-translation";
import type { UserCarsResponse, ProductItem } from "~/lib/client/types.gen";

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
          slug_en: englishSlugById.get(product.id) ?? product.slug_en,
        })) as ProductItem[];
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
      <div className="w-full h-[500px] md:h-[300px] relative overflow-hidden">
        <img src="/garage/garage-banner.png" alt="" aria-hidden
             className="absolute inset-0 w-full h-full object-cover" />
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
        className="group w-full relative overflow-hidden min-h-[500px] md:min-h-[300px]"
        dir={isRtl ? "rtl" : "ltr"}
        aria-label={
          fallbackCar
            ? t("featuredBanner.featuredFor", {
                brand: fallbackCar.brand,
                model: fallbackCar.model,
              })
            : "Featured products"
        }
      >
        {/* Fixed background */}
        <img src="/garage/garage-banner.png" alt="" aria-hidden
             className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/45" aria-hidden />

        {/* Slide stack */}
        <div className="relative min-h-[500px] md:min-h-[300px]">
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
                <div className="w-full max-w-7xl mx-auto px-5 md:px-6 grid grid-rows-[175px_auto] md:flex min-h-[500px] md:min-h-[300px]">
                  {image && (
                    <div className="md:hidden row-start-1 flex items-end justify-center pt-8">
                      <Link
                        to={path}
                        aria-label={name || t("featuredBanner.viewProduct")}
                        className="inline-block"
                      >
                        <img
                          src={image}
                          alt={name}
                          loading="lazy"
                          className="h-[175px] w-auto max-w-[84vw] object-contain drop-shadow-2xl transition-transform duration-500 ease-out group-hover:scale-105 group-hover:-translate-y-1"
                        />
                      </Link>
                    </div>
                  )}

                  {/* Text */}
                  <div className="row-start-2 flex-1 flex flex-col justify-end md:justify-center pb-20 md:py-10">
                    <p className="text-white/75 uppercase text-[11px] md:text-base font-semibold tracking-[0.2em] mb-3 md:mb-4">
                      {carLabel}
                    </p>
                    <h2 className="text-white uppercase font-black text-[clamp(2rem,8vw,2.6rem)] md:text-4xl leading-[0.92] max-w-[95%] md:max-w-md break-words [display:-webkit-box] [-webkit-line-clamp:4] [-webkit-box-orient:vertical] overflow-hidden md:[display:block] md:[-webkit-line-clamp:unset]">
                      {name}
                    </h2>
                    <Link to={path}
                          className="w-fit mt-8 bg-white px-6 md:px-8 py-2.5 md:py-3 text-xs md:text-sm font-black uppercase tracking-[0.18em] hover:opacity-90 active:opacity-75 transition-opacity"
                          style={{ color: "#CF172F" }}>
                      {t("featuredBanner.viewProduct")}
                    </Link>
                  </div>

                  {/* Desktop product image */}
                  {image && (
                    <div className="hidden md:flex w-[45%] items-center justify-center">
                      <Link
                        to={path}
                        aria-label={name || t("featuredBanner.viewProduct")}
                        className="inline-block"
                      >
                        <img src={image} alt={name} loading="lazy"
                             className="h-[300px] w-auto object-contain drop-shadow-2xl transition-transform duration-500 ease-out group-hover:scale-105 group-hover:-translate-y-1" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Arrows */}
        {count > 1 && (
          <>
            <button type="button" onClick={isRtl ? goNext : goPrev} aria-label="Previous"
                    className="absolute left-3 md:left-5 top-[43%] md:top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-9 md:h-9 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center transition-colors">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button type="button" onClick={isRtl ? goPrev : goNext} aria-label="Next"
                    className="absolute right-3 md:right-5 top-[43%] md:top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-9 md:h-9 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center transition-colors">
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </>
        )}

        {/* Progress dots */}
        {count > 1 && (
          <div className="absolute bottom-6 md:bottom-5 left-0 right-0 flex justify-center gap-2 z-20">
            {products.map((_, i) => (
              <button type="button" key={i} onClick={() => goTo(i)} aria-label={`Product ${i + 1}`}
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
